import { Container, FederatedPointerEvent, Point, TilingSprite, type Application } from "pixi.js";
import { TableState, type FlipCardOpts, type GrabOpts, type MoveCardsOpts, type MoveCardsToNewPileOpts, type ReleaseOpts, type ShuffleCardsOpts, type TableStateEntity } from "./TableState";
import { TableNetwork } from "./TableNetwork";
import type { TableSprite } from "./sprites/TableSprite";
import type { CardSprite } from "./sprites/CardSprite";
import { randomId } from "./util/Utilities";
import { TableBackgroundSprite } from "./sprites/TableBackgroundSprite";
import { Hand } from "./models/Hand";
import { OwnHandSprite } from "./sprites/OwnHandSprite";
import { OtherHandSprite } from "./sprites/OtherHandSprite";
import { PileSprite } from "./sprites/PileSprite";
import { Pile } from "./models/Pile";
import { SidePanelSprite } from "./ui/SidePanelSprite";
import { LooseCards } from "./models/LooseCards";
import type { TableAnimation } from "./animation/TableAnimation";
import { PileCardFlipAnimation } from "./animation/PileCardFlipAnimation";
import 'pixi.js/math-extras';
import { HandCardFlipAnimation } from "./animation/HandCardFlipAnimation";
import type { Card } from "./models/Card";
import { PileShuffleAnimation } from "./animation/PileShuffleAnimation";

interface RenderContainers {
    // Table layer
    tableContainer: Container,
    // Layer above the table for grabbed entities
    floatingContainer: Container,
    // Layer containing hands
    handContainer: Container,
    // Layer with topmost UI elements
    uiContainer: Container
}

export class TableEngine {
    public app: Application;
    public tableState: TableState;
    public tableNetwork: TableNetwork;

    private renderContainers: RenderContainers;

    private backgroundSprite: TilingSprite;
    public sidePanel: SidePanelSprite;
    private bgDragging: boolean = false;
    public sprites: Map<string, TableSprite> = new Map();

    public worldOffset: Point;

    public dragging: boolean;
    public firstDrag: boolean;
    public spriteMouseOffset?: Point;
    public pointerDownTime: number = 0;
    public pointerDownPosition?: Point;
    public releaseOnTap: boolean;
    public grabbedCardIndex?: number;

    private eventQueue: (() => void)[] = [];
    private animationQueue: TableAnimation<any>[] = [];

    static async initialize(app: Application): Promise<TableEngine> {
        const tableState = new TableState();
        const tableNetwork = await TableNetwork.createTable(tableState);
        const tableEngine = new TableEngine(app, tableState, tableNetwork);

        tableNetwork.tableCall({
            methodName: "addDeck",
            opts: { newId: randomId(), playerId: tableNetwork.myself.id, gridX: 0, gridY: 0 }
        });

        tableNetwork.tableCall({
            methodName: "addHand",
            opts: { playerId: tableNetwork.myself.id }
        });

        return tableEngine;
    }
    
    private constructor(app: Application, tableState: TableState, tableNetwork: TableNetwork) {
        this.app = app;
        this.tableState = tableState;
        this.tableNetwork = tableNetwork;
        this.worldOffset = new Point((this.app.renderer.width - 100) / 2, -(this.app.renderer.height * 0.8 - 132) / 2);
        this.backgroundSprite = new TableBackgroundSprite(this.app.renderer.width, this.app.renderer.height);
        this.backgroundSprite.eventMode = "dynamic";

        this.backgroundSprite.on('pointerdown', (event) => {
            this.bgDragging = true;
        })

        this.backgroundSprite.on("globalpointermove", (event) => {
            if (this.bgDragging) {
                this.worldOffset.x += event.movementX;
                this.worldOffset.y -= event.movementY;
            }
        });

        this.sidePanel = new SidePanelSprite(this);

        this.backgroundSprite.on('pointerup', (event => {
            this.bgDragging = false;
        }));
        this.backgroundSprite.on('pointerupoutside', (event => {
            this.bgDragging = false;
        }));

        this.app.stage.addChild(this.backgroundSprite);

        this.renderContainers = {
            tableContainer: new Container(),
            floatingContainer: new Container(),
            handContainer: new Container(),
            uiContainer: new Container()
        };

        this.renderContainers.uiContainer.addChild(this.sidePanel);

        this.dragging = false;
        this.firstDrag = true;
        this.releaseOnTap = false;
        this.app.stage.eventMode = "static";
        this.initPointerReleaseCallbacks();
        this.initTableStateCallbacks();

        this.app.stage.addChild(this.renderContainers.tableContainer);
        this.app.stage.addChild(this.renderContainers.handContainer);
        this.app.stage.addChild(this.renderContainers.floatingContainer);
        this.app.stage.addChild(this.renderContainers.uiContainer);
    }

    // Sets up pointer release mechanisms
    private initPointerReleaseCallbacks() {
        this.app.stage.on("pointerup", (event) => {
            this.dragging = false;
            this.eventQueue.push(this.handleReleaseFunct(event));
        });
        this.app.stage.on("pointerupoutside", (event) => {
            this.dragging = false;
            this.eventQueue.push(this.handleReleaseFunct(event));
        })
        this.app.stage.on("globalpointermove", (event) => {
            if (this.dragging) {
                this.eventQueue.push(this.handleMoveFunct(event));
            }
        })
    }

    public run() {
        this.app.ticker.add((ticker) => {
            this.drawTable();
        })
    }

    public decorateCardBehavior(card: CardSprite, index: number = 0) {
        card.onDown = (sprite, event) => {
            this.dragging = true;
            this.eventQueue.push(this.handlePointerDownFunct(sprite, index, event));
        };
        // card.onMove = (sprite, event) => {
        //     if (this.dragging) {
        //         this.eventQueue.push(this.handleCardInitialMove(sprite, index, event));
        //     }
        // }
        // card.onTap = (c: PointerEventSprite, event: FederatedPointerEvent) => {
        //     this.eventQueue.push(this.handleTapFunct(c, event));
        // };
    }

    private initTableStateCallbacks() {
        this.tableState.onGrab = (opts: GrabOpts, grabbedEntity: TableStateEntity) => {
            if (opts.playerId === this.tableNetwork.myself.id) {
                this.sidePanel.setContext(opts, grabbedEntity);
            }
        }
        this.tableState.onRelease = (opts: ReleaseOpts) => {
            if (opts.playerId === this.tableNetwork.myself.id) {
                this.sidePanel.setContext();
            }
        }
        this.tableState.onMoveCards = (opts: MoveCardsOpts) => {
            if (opts.playerId === this.tableNetwork.myself.id) {
                this.sidePanel.setContext();
            }
        }
        this.tableState.onMoveCardsToNewPile = (opts: MoveCardsToNewPileOpts) => {
            if (opts.playerId === this.tableNetwork.myself.id) {
                this.sidePanel.setContext();
            }
        }
        this.tableState.onFlipCards = (opts: FlipCardOpts, grabbedEntityId: string,
            grabbedEntity: TableStateEntity, indices?: number[]) => {
            if (LooseCards.isLooseCards(grabbedEntity)) {
                this.animationQueue.push(new PileCardFlipAnimation(this, grabbedEntityId, grabbedEntity.from))
            } else if (Pile.isPile(grabbedEntity)) {
                this.animationQueue.push(new PileCardFlipAnimation(this, grabbedEntityId))
            } else if (Hand.isHand(grabbedEntity) && indices) {
                this.animationQueue.push(new HandCardFlipAnimation(grabbedEntityId, indices));
            }
        }
        this.tableState.onShuffleCards = (opts: ShuffleCardsOpts, grabbedEntityId: string,
            grabbedEntity: TableStateEntity, prevDeck: Card[]) => {
            if (Pile.isPile(grabbedEntity) || LooseCards.isLooseCards(grabbedEntity)) {
                this.animationQueue.push(new PileShuffleAnimation(grabbedEntityId, prevDeck));
            }
        }
    }

    private getPointerIntersection(screenX: number, screenY: number, ignoreId?: string): string | undefined {
        for (let id of this.sprites.keys()) {
            if (id === ignoreId) {
                continue;
            }
            let bounds = this.sprites.get(id)!.getBounds(false);
            if (bounds.containsPoint(screenX, screenY)) {
                return id;
            }
        }
        return;
    }

    private handlePointerDownFunct(intersectSprite: TableSprite, index: number, event: FederatedPointerEvent) {
        return () => {
            console.log('handlePointerDownFunct called')
            this.pointerDownTime = Date.now();
            this.pointerDownPosition = event.global.clone();
            this.spriteMouseOffset = intersectSprite.toLocal({ x: event.globalX, y: event.globalY });
            this.grabbedCardIndex = index;

            const grab = this.tableState.grabbing.get(this.tableNetwork.myself.id);
            if (grab && grab.fromId === intersectSprite.id) {
                this.releaseOnTap = true;
            } else {
                this.releaseOnTap = false;
                // Use the local position to know where on the sprite the pointer has grabbed it
                const worldPos = this.fromScreenToWorldPosition(intersectSprite.toGlobal({ x: 0, y: 0 }));
                this.tableNetwork.committedTableCall({
                    methodName: "grab",
                    opts: {
                        playerId: this.tableNetwork.myself.id,
                        newId: randomId(),
                        indices: [index],
                        fromId: intersectSprite.id,
                        initialWorldX: worldPos.worldX,
                        initialWorldY: worldPos.worldY,
                        selecting: true
                    }
                });
            }
        };
    }

    private handleMoveFunct(event: FederatedPointerEvent) {
        return () => {
            let grab = this.tableState.grabbing.get(this.tableNetwork.myself.id);
            if (grab && this.spriteMouseOffset &&
                this.pointerDownPosition && this.distish(this.pointerDownPosition, event.global) > 20) {
                if (this.firstDrag) {
                    // Transform the currently grabbed entity into LooseCards
                    const grabbedEntity = this.tableState.entities.get(grab.fromId);
                    const grabbedSprite = this.sprites.get(grab.fromId);
                    if (grabbedSprite && grabbedEntity && !LooseCards.isLooseCards(grabbedEntity)) {
                        let positionSprite = grabbedSprite;
                        if (typeof this.grabbedCardIndex !== 'undefined') {
                            const ps = grabbedSprite.getCardSprite(this.grabbedCardIndex);
                            positionSprite = ps ?? positionSprite;
                        }
                        this.spriteMouseOffset = positionSprite.toLocal({ x: event.globalX, y: event.globalY });
                        const worldPos = this.fromScreenToWorldPosition(positionSprite.toGlobal({ x: 0, y: 0 }));
                        this.tableNetwork.committedTableCall({
                            methodName: "grab",
                            opts: {
                                playerId: this.tableNetwork.myself.id,
                                newId: randomId(),
                                fromId: grab.fromId,
                                initialWorldX: worldPos.worldX,
                                initialWorldY: worldPos.worldY,
                                indices: grab.indices,
                                selecting: false
                            }
                        })
                    }
                    this.firstDrag = false;
                } else {
                    const spriteEntToMove = this.sprites.get(grab.fromId);
                    if (spriteEntToMove) {
                        this.tableNetwork.tableCall({
                            methodName: "grabbedCardPosition",
                            opts: {
                                ...this.fromScreenToWorldPosition(new Point(
                                    event.globalX - this.spriteMouseOffset.x,
                                    event.globalY - this.spriteMouseOffset.y
                                )),
                                playerId: this.tableNetwork.myself.id
                            }
                        });
                    }
                }   
            }
        };
    }

    private handleReleaseFunct(event: FederatedPointerEvent) {
        return () => {
            console.log("in handleReleaseFunct");
            this.firstDrag = true;
            const grab = this.tableState.grabbing.get(this.tableNetwork.myself.id);
            // Check that this is not a tap event.
            if (Date.now() - this.pointerDownTime > 250 &&
                this.pointerDownPosition && this.distish(this.pointerDownPosition, event.global) > 20) {
                if (grab) {
                    const intersectingId = this.getPointerIntersection(event.globalX, event.globalY, grab.fromId);
                    if (intersectingId) {
                        const intersectingSprite = this.sprites.get(intersectingId);
                        if (intersectingSprite && intersectingSprite.onDragRelease) {
                            intersectingSprite.onDragRelease(this, event);
                        }
                    } else if (this.isInCardDropSquare(event.globalX, event.globalY)) {
                        const gridPos = this.fromScreenToGridPosition(event.globalX, event.globalY);
                        this.tableNetwork.tableCall({
                            methodName: "moveCardsToNewPile",
                            opts: {
                                playerId: this.tableNetwork.myself.id,
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
                    }
                }
            } else if (grab && typeof this.grabbedCardIndex !== 'undefined') {
                // Tap event case
                const grabbed = this.tableState.entities.get(grab.fromId);
                const grabbedSprite = this.sprites.get(grab.fromId);
                // If these are LooseCards from some extant origin, call the origin's
                // onTapRelease. Otherwise, attempt to call this entity's onTapRelease
                if (grabbed && LooseCards.isLooseCards(grabbed) &&
                    this.sprites.has(grabbed.from.fromId)) {
                    const grabbedFromSprite = this.sprites.get(grabbed.from.fromId);
                    if (grabbedFromSprite && grabbedFromSprite.onTapRelease) {
                        grabbedFromSprite.onTapRelease(this, event, this.releaseOnTap, this.grabbedCardIndex);
                    }
                } else if (grabbedSprite && grabbedSprite.onTapRelease) {
                    grabbedSprite.onTapRelease(this, event, this.releaseOnTap, this.grabbedCardIndex);
                }
            }
            if (this.releaseOnTap) {
                this.releaseOnTap = false;
            }
            delete this.spriteMouseOffset;
            delete this.pointerDownPosition;
            delete this.grabbedCardIndex;
        }
    }

    private drawTable() {
        this.sprites.clear();
        this.renderContainers.floatingContainer.removeChildren();
        this.renderContainers.tableContainer.removeChildren();
        this.renderContainers.handContainer.removeChildren();

        // Update background
        this.backgroundSprite.tilePosition.x = this.worldOffset.x;
        this.backgroundSprite.tilePosition.y = -this.worldOffset.y;

        // Position entities
        this.placeEntities();

        // Draw entities
        for (let entity of this.sprites.values()) {
            entity.draw(this);
        }

        // Apply events from input event queue
        let queuedEventFunc;
        this.eventQueue.reverse();
        while (queuedEventFunc = this.eventQueue.pop()) {
            queuedEventFunc();
        }

        // Update side panel


        // Apply animations from animation queue
        for (let i = 0; i < this.animationQueue.length; ) {
            const queuedAnimation = this.animationQueue[i]!;
            const target = queuedAnimation.selectTarget(this);
            if (target) {
                queuedAnimation.animate(target);
            }
            if (queuedAnimation.completion >= 1) {
                this.animationQueue.splice(i, 1);
            } else {
                i++;
            }
        }
    }

    private placeEntities() {
        const otherHandSprites: OtherHandSprite[] = [];
        for (let entityId of this.tableState.entities.keys()) {
            const entity = this.tableState.entities.get(entityId)!;
            if (Hand.isHand(entity)) {
                if (entityId === this.tableNetwork.myself.id) {
                    this.addOwnHand(entity);
                } else {
                    otherHandSprites.push(this.addOtherHand(entity));
                }
            } else if (Pile.isPile(entity)) {    
                this.addPile(entityId, entity);
            } else if (LooseCards.isLooseCards(entity)) {
                this.addLooseCards(entityId, entity);
            }
        }
        this.repositionOtherHandSprites(otherHandSprites);
    }

    private addOwnHand(hand: Hand): OwnHandSprite {
        const h = new OwnHandSprite(hand, this.app.renderer.width, this.app.renderer.height);
        this.renderContainers.handContainer.addChild(h);
        this.sprites.set(hand.playerId, h);
        return h;
    }
    
    private addOtherHand(hand: Hand): OtherHandSprite {
        // Render someone else's hand
        const h = new OtherHandSprite(hand, "xs");
        this.renderContainers.handContainer.addChild(h);
        this.sprites.set(hand.playerId, h);
        return h;
    }

    private repositionOtherHandSprites(handSprites: OtherHandSprite[]) {
        const l = handSprites.length;
        for (let i = 0; i < l; i++) {
            const h = handSprites[i]!;
            h.x = (i + 1) * this.app.renderer.width / (l + 1) - h.width / 2;
            h.y = 0;
        }
    }

    private addLooseCards(id: string, looseCards: LooseCards) {
        const p = new PileSprite(id, looseCards);
        this.renderContainers.floatingContainer.addChild(p);
        this.sprites.set(id, p);
        const screenPos = this.fromWorldToScreenPosition(looseCards);
        p.x = screenPos.x;
        p.y = screenPos.y;
    }

    private addPile(id: string, pile: Pile) {
        const p = new PileSprite(id, pile);
        this.renderContainers.tableContainer.addChild(p);
        this.sprites.set(id, p);
        const screenPos = this.fromGridToScreenPosition(pile.gridX, pile.gridY);
        // Offset to center the pile
        p.x = screenPos.x + 10;
        p.y = screenPos.y + 10;
    }

    public fromScreenToWorldPosition(screenPos: Point): {worldX: number, worldY: number} {
        return {
            worldX: screenPos.x - this.worldOffset.x,
            worldY: screenPos.y + this.worldOffset.y
        }
    }

    private fromWorldToScreenPosition(worldPos: { worldX: number, worldY: number }): Point {
        return new Point(worldPos.worldX + this.worldOffset.x, worldPos.worldY - this.worldOffset.y);
    }

    private fromScreenToGridPosition(screenX: number, screenY: number): Point {
        const indX = Math.floor((screenX - this.worldOffset.x) / 100);
        const indY = Math.floor((screenY + this.worldOffset.y) / 132);
        return new Point(indX, indY);
    }

    private fromGridToScreenPosition(gridPosX: number, gridPosY: number): Point {
        return new Point(gridPosX * 100 + this.worldOffset.x, -(gridPosY * -132 + this.worldOffset.y));
    }

    private isInCardDropSquare(screenX: number, screenY: number): boolean {
        const modX = Math.abs((screenX - this.worldOffset.x) % 100);
        const modY = Math.abs((screenY + this.worldOffset.y) % 132);
        return modX >= 10 && modX <= 80 && modY >= 10 && modY <= 112;
    }

    private distish(a: Point, b: Point): number {
        const xd = b.x - a.x;
        const yd = b.y - a.y;
        return (xd * xd) + (yd * yd);
    }
}