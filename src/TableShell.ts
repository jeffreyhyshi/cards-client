import { type TableSprite } from './sprites/TableSprite';
import { TableNetwork } from './TableNetwork';
import { TableState, type GrabbedCardPositionOpts, type GrabOpts, type MoveCardsOpts, type MoveCardsToNewPileOpts, type ReleaseOpts, type TableStateEntity } from './TableState';
import { Hand } from './models/Hand';
import { Pile } from './models/Pile';
import { TilingSprite, type Application, type Bounds, type Container, type FederatedPointerEvent, Point } from 'pixi.js';
import { PileSprite } from './sprites/PileSprite';
import type { PointerEventSprite } from './sprites/PointerEventSprite';
import { OwnHandSprite } from './sprites/OwnHandSprite';
import { SidePanelSprite } from './ui/SidePanelSprite';
import type { CardSprite } from './sprites/CardSprite';
import { TableBackgroundSprite } from './sprites/TableBackgroundSprite';
import { Filters } from './util/Filters';
import { randomId } from './util/Utilities';

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
    public backgroundSprite: TilingSprite;
    public worldOffset: Point;
    private bgDragging: boolean = false;

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
        this.backgroundSprite = new TableBackgroundSprite(this.app.renderer.width, this.app.renderer.height);
        // Opinionated default offset
        this.worldOffset = new Point((this.app.renderer.width - 100) / 2, -(this.app.renderer.height * 0.8 - 132) / 2);

        tableNetwork.tableCall({
            methodName: "addDeck",
            opts: { newId: randomId(), playerId: this.tableNetwork.myself.id, gridX: 0, gridY: 0 }
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
                    if (grabOpts.indices) {
                        spriteToMove = spriteToMove.getCardSprite(grabOpts.indices) ?? spriteToMove;
                    }
                    if (spriteToMove.parent) {
                        if (!(opts.playerId === this.tableNetwork.myself.id)) {
                            spriteToMove.filters = [Filters.wavyFilter(this.app)];
                            spriteToMove.alpha = 0.5;
                        }
                        const localCoords = spriteToMove.parent.toLocal(this.fromWorldToScreenPosition(opts));
                        spriteToMove.x = localCoords.x;
                        spriteToMove.y = localCoords.y;
                    }
                }
            }
        };

        tableState.onMoveCards = (opts: MoveCardsOpts) => {
            // const fromSprite = this.spriteEntities.get(opts.fromId);
            // const toSprite = this.spriteEntities.get(opts.toId);
            // if (fromSprite) {
            //     fromSprite.redraw(this);
            // }
            // if (toSprite) {
            //     toSprite.redraw(this);
            // }
            this.initFromState();
        }

        tableState.onMoveCardsToNewPile = (opts: MoveCardsToNewPileOpts) => {
            this.initFromState();
        }

        this.tableNetwork.tableShell = this;

        this.backgroundSprite.eventMode = "dynamic";

        this.backgroundSprite.on('pointerdown', (event) => {
            this.bgDragging = true;
        })
        
        this.backgroundSprite.on("globalpointermove", (event) => {
            if (this.bgDragging) {
                this.worldOffset.x += event.movementX;
                this.worldOffset.y -= event.movementY;
                this.initFromState();
            }
        });

        this.backgroundSprite.on('pointerup', (event => {
            this.bgDragging = false;
        }));
        this.backgroundSprite.on('pointerupoutside', (event => {
            this.bgDragging = false;
        }));
    }

    // Reset and draw from the state
    public initFromState() {
        this.spriteEntities.clear();
        this.spriteBounds.clear();
        this.app.stage.removeChildren();
        this.backgroundSprite.tilePosition.x = this.worldOffset.x;
        this.backgroundSprite.tilePosition.y = -this.worldOffset.y;
        this.app.stage.addChild(this.backgroundSprite);

        this.redrawEntities();
    }

    public redrawEntities() {
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

    public decorateCardBehavior(parent: TableSprite, card: CardSprite, index: number = 0) {
        card.draggable = true;
        card.onMoveStart = () => {
            this.tableNetwork.committedTableCall({
                methodName: "grab",
                opts: {
                    fromId: parent.id,
                    indices: [index],
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
                    ...this.fromScreenToWorldPosition(screenPos),
                    playerId: this.tableNetwork.myself.id
                }
            });
            if (this.isPointerIntersection(event.globalX, event.globalY, c) || this.isInCardDropSquare(event.globalX, event.globalY)) {
                c.rotation = 0;
            } else {
                c.rotation = Math.PI / 36;
            }
        }
        card.onRelease = (c: PointerEventSprite, event: FederatedPointerEvent) => {
            if (!this.triggerPointerIntersections(event.globalX, event.globalY, card, false)) {
                if (this.isInCardDropSquare(event.globalX, event.globalY)) {
                    const gridPos = this.fromScreenToGridPosition(event.globalX, event.globalY);
                    console.log("card.onRelease");
                    console.log(gridPos);
                    console.log("current table ents: ")
                    console.log(this.spriteEntities)
                    this.tableNetwork.tableCall({
                        methodName: "moveCardsToNewPile",
                        opts: {
                            playerId: this.tableNetwork.myself.id,
                            fromId: c.id,
                            indices: [index],
                            newId: randomId(),
                            gridX: gridPos.x,
                            gridY: gridPos.y
                        }
                    });
                } else {
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
    }

    private addPile(id: string, pile: Pile) {
        const p = new PileSprite(id, pile);
        this.app.stage.addChild(p);
        this.spriteEntities.set(id, p);
        const screenPos = this.fromGridToScreenPosition(pile.gridX, pile.gridY);
        p.x = screenPos.x + 10;
        p.y = -screenPos.y + 10;
        p.redraw(this);
    }

    // Provides a list of entities that the cursor position is currently intersecting
    // Returns true if one or more actions were triggered
    private triggerPointerIntersections(screenX: number, screenY: number, grabbed: TableSprite, isHover: boolean = false): boolean {
        for (let id of this.spriteEntities.keys()) {
            let bounds = this.spriteBounds.get(id);
            if (!bounds) {
                // Calculate bounds
                bounds = this.spriteEntities.get(id)!.getBounds(true);
                this.spriteBounds.set(id, bounds);
            }
            if (bounds.containsPoint(screenX, screenY) && !(id === grabbed.id)) {
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

    private isPointerIntersection(screenX: number, screenY: number, grabbed: TableSprite): boolean {
        for (let id of this.spriteEntities.keys()) {
            console.log("in ispi")
            let bounds = this.spriteBounds.get(id);
            if (!bounds) {
                // Calculate bounds
                bounds = this.spriteEntities.get(id)!.getBounds(true);
                this.spriteBounds.set(id, bounds);
            }
            if (bounds.containsPoint(screenX, screenY) && !(id === grabbed.id)) {
                console.log("ispointerintersection")
                return true;
            }
        }
        return false;
    }

    private isInCardDropSquare(screenX: number, screenY: number): boolean {
        const modX = Math.abs((screenX - this.worldOffset.x) % 100);
        const modY = Math.abs((screenY + this.worldOffset.y) % 132);
        return modX >= 10 && modX <= 80 && modY >= 10 && modY <= 112;
    }

    private fromScreenToGridPosition(screenX: number, screenY: number): Point {
        const indX = Math.floor((screenX - this.worldOffset.x) / 100);
        const indY = Math.floor((screenY + this.worldOffset.y) / 132);
        return new Point(indX, indY);
    }

    // Calculates the screen rendering position based on a card grid position
    private fromGridToScreenPosition(gridPosX: number, gridPosY: number): Point {
        return new Point(gridPosX * 100 + this.worldOffset.x, gridPosY * -132 + this.worldOffset.y);
    }

    private fromScreenToWorldPosition(screenPos: Point): {worldX: number, worldY: number} {
        return {
            worldX: screenPos.x - this.worldOffset.x,
            worldY: screenPos.y + this.worldOffset.y
        }
    }

    private fromWorldToScreenPosition(worldPos: { worldX: number, worldY: number }): Point {
        return new Point(worldPos.worldX + this.worldOffset.x, worldPos.worldY - this.worldOffset.y);
    }

    private addHand(hand: Hand) {
        // Render our own hand
        if (hand.playerId === this.tableNetwork.myself.id) {
            const h = new OwnHandSprite(hand, this.app.renderer.width, this.app.renderer.height);
            this.app.stage.addChild(h);
            h.redraw(this);
            this.spriteEntities.set(hand.playerId, h);
        } else {
        // Render someone else's hand

        }
    }
} 