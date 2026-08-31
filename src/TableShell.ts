import { type TableSprite } from './sprites/TableSprite';
import { TableNetwork } from './TableNetwork';
import { TableState, type GrabbedCardPositionOpts, type GrabOpts, type MoveCardsOpts, type ReleaseOpts, type TableStateEntity } from './TableState';
import { Hand } from './models/Hand';
import { Pile } from './models/Pile';
import type { Application, Bounds, Container, FederatedPointerEvent, Point } from 'pixi.js';
import { PileSprite } from './sprites/PileSprite';
import type { PointerEventSprite } from './sprites/PointerEventSprite';
import { OwnHandSprite } from './sprites/OwnHandSprite';
import { SidePanelSprite } from './sprites/SidePanelSprite';
import type { CardSprite } from './sprites/CardSprite';

// Graphics/UI layer. Renders based on the underlying TableState. Communicates user actions to TableNetwork.
export class TableShell {
    public app: Application;
    public tableState: TableState;
    public tableNetwork: TableNetwork;
    // Maps from TableState entity IDs to visual entities
    public spriteEntities: Map<string, TableSprite> = new Map();
    // Cache TableState entity bounding boxes
    public spriteBounds: Map<string, Bounds> = new Map();
    public sidePanel: SidePanelSprite;

    static async initialize(app: Application): Promise<TableShell> {
        const tableState = new TableState();
        const tableNetwork = await TableNetwork.createTable(tableState);
        const tableShell = new TableShell(app, tableState, tableNetwork);
        tableShell.initFromState();
        return tableShell;
    }

    private constructor(app: Application, tableState: TableState, tableNetwork: TableNetwork) {
        this.app = app;
        this.tableState = tableState;
        this.tableNetwork = tableNetwork;
        this.sidePanel = new SidePanelSprite(this);

        tableNetwork.tableCall({
            methodName: "addDeck",
            opts: { playerId: this.tableNetwork.myself.id, worldX: 50, worldY: 50 }
        });

        tableNetwork.tableCall({
            methodName: "addHand",
            opts: { playerId: this.tableNetwork.myself.id }
        })

        tableState.onRelease = (opts: ReleaseOpts, released: GrabOpts) => {
            // Return any loose cards to their previous owners
            // TODO: actual card moved states
            // TODO: animate release
            const p = this.spriteEntities.get(released.fromId);
            p?.redraw(this);
        }

        tableState.onGrabbedCardPosition = (opts: GrabbedCardPositionOpts) => {
            const grabOpts = tableState.grabbedEntities.get(opts.playerId);
            if (grabOpts) {
                let spriteToMove = this.spriteEntities.get(grabOpts.fromId);
                if (spriteToMove) {
                    // FIXME: standardize response to these in TableSprite
                    if (PileSprite.isPileSprite(spriteToMove) &&
                            grabOpts.indices && grabOpts.indices[0] === 0) {
                        spriteToMove = spriteToMove.topCardSprite ?? spriteToMove;
                    }
                    if (spriteToMove.parent) {
                        const localCoords = spriteToMove.parent.toLocal({ x: opts.worldX, y: opts.worldY })
                        spriteToMove.x = localCoords.x;
                        spriteToMove.y = localCoords.y;
                    }
                }
            }
        };

        tableState.onMoveCards = (opts: MoveCardsOpts) => {
            console.log("cards moved")
            const fromSprite = this.spriteEntities.get(opts.fromId);
            const toSprite = this.spriteEntities.get(opts.toId);
            if (fromSprite) {
                fromSprite.redraw(this);
            }
            if (toSprite) {
                toSprite.redraw(this);
            }
        }

        this.tableNetwork.tableShell = this;
    }

    // Reset and draw from the state
    public initFromState() {
        this.spriteEntities.clear();
        this.app.stage.removeChildren();
        // Iterate through state entities
        for (let entityId of this.tableState.entities.keys()) {
            const entity = this.tableState.entities.get(entityId)!;
            if (Hand.isHand(entity)) {
                this.addHand(entity);
            } else if (Pile.isPile(entity)) {
                this.addPile(entityId, entity);
            }
        }
        this.app.stage.addChild(this.sidePanel);
    }

    public decorateCardBehavior(parent: TableSprite, card: CardSprite) {
        card.draggable = true;
        card.onMoveStart = () => {
            console.log("grabbed - card callback");
            this.tableNetwork.committedTableCall({
                methodName: "grab",
                opts: {
                    fromId: parent.id,
                    indices: [0],
                    playerId: this.tableNetwork.myself.id,
                }
            });
        }
        card.onMove = (c: PointerEventSprite, event: FederatedPointerEvent) => {
            const screenPos = card.toGlobal({ x: event.movementX, y: event.movementY });
            // TODO: Animate partial drag/drop snapping
            this.tableNetwork.tableCall({
                methodName: "grabbedCardPosition",
                opts: {
                    ...this.toWorldPosition(screenPos),
                    playerId: this.tableNetwork.myself.id
                }
            });
        }
        card.onRelease = (c: PointerEventSprite, event: FederatedPointerEvent) => {
            console.log("released - card callback");
            console.log(this.spriteEntities);
            if (!this.triggerPointerIntersections(event.globalX, event.globalY, card, false)) {
                this.tableNetwork.tableCall({
                    methodName: "release",
                    opts: {
                        playerId: this.tableNetwork.myself.id,
                    }
                });
                // TODO: animate release
                parent.redraw(this);
            }
        }
    }

    private addPile(id: string, pile: Pile) {
        const p = new PileSprite(id, pile);
        this.app.stage.addChild(p);
        this.spriteEntities.set(id, p);
        p.x = pile.worldX;
        p.y = pile.worldY;
        p.redraw(this);
    }

    // Provides a list of entities that the cursor position is currently intersecting
    // Returns true if one or more actions were triggered
    private triggerPointerIntersections(x: number, y: number, grabbed?: TableSprite, isHover: boolean = false): boolean {
        for (let id of this.spriteEntities.keys()) {
            let bounds = this.spriteBounds.get(id);
            if (!bounds) {
                // Calculate bounds
                bounds = this.spriteEntities.get(id)!.getBounds(true);
                this.spriteBounds.set(id, bounds);
            }
            if (bounds.containsPoint(x, y)) {
                const entity = this.spriteEntities.get(id)
                if (entity) {
                    if (isHover && entity.reactHover) {
                        entity.reactHover(this, grabbed);
                        return true;
                    } else if (entity.reactRelease) {
                        entity.reactRelease(this, grabbed);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private toWorldPosition(screenPos: Point): {worldX: number, worldY: number} {
        // No-op for now TODO: implement infinite scroll table plane
        return {
            worldX: screenPos.x,
            worldY: screenPos.y
        }
    }

    private addHand(hand: Hand) {
        // Render our own hand
        if (hand.playerId === this.tableNetwork.myself.id) {
            const h = new OwnHandSprite(hand, this.app.renderer.width, this.app.renderer.height);
                this.app.stage.addChild(h);
                this.spriteEntities.set(hand.playerId, h);
        } else {
        // Render someone else's hand

        }
    }
} 