import { Container, FederatedPointerEvent, NineSliceSprite, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { TableShell } from '../TableShell';
import type { ResizableSprite } from './ResizableSprite';
import type { TableSprite } from './TableSprite';
import { Hand } from '../models/Hand';
import { CardSprite } from './CardSprite';
import type { TableEngine } from '../TableEngine';
import { randomId } from '../util/Utilities';

export class OwnHandSprite extends Container implements TableSprite, ResizableSprite {
    public type: "ownhand" = "ownhand";
    public id: string;
    public hand: Hand;

    private barNineSliceSprite?: NineSliceSprite;
    private handIconSprite?: Sprite;
    private backgroundSprite?: TilingSprite;

    private screenWidth: number;
    private screenHeight: number;

    private cardSprites: CardSprite[] = [];

    static isOwnHandSprite(s: TableSprite): s is OwnHandSprite {
        return s.type === "ownhand";
    }

    constructor(hand: Hand, initialScreenWidth: number, initialScreenHeight: number) {
        super();
        this.id = hand.playerId;
        this.screenWidth = initialScreenWidth;
        this.screenHeight = initialScreenHeight;
        this.hand = hand;
    }

    public draw(table: TableEngine) {
        this.removeChildren();

        this.y = this.screenHeight * 0.87;

        this.backgroundSprite = new TilingSprite({
            texture: Texture.from('hand_grid.png'),
            width: this.screenWidth,
            height: this.screenHeight * 0.13
        });
        this.addChild(this.backgroundSprite);
        this.backgroundSprite.y = 24;

        this.barNineSliceSprite = new NineSliceSprite({
            texture: Texture.from("bar.png"),
            topHeight: 3,
            bottomHeight: 1,
            leftWidth: 24,
            rightWidth: 24,
            width: this.screenWidth,
            height: 24
        });
        this.addChild(this.barNineSliceSprite);

        this.handIconSprite = new Sprite(Texture.from("hand.png"));
        this.addChild(this.handIconSprite);
        this.handIconSprite.x = 4;
        this.handIconSprite.y = 4;

        this.cardSprites = [];
        const l = this.hand.cards.length;
        for (let i = 0; i < l; i++) {
            let card = this.hand.cards[i]!;
            let cardSprite = new CardSprite(this.id, card);
            this.addChild(cardSprite);
            cardSprite.x = (i + 1) * this.screenWidth / (l + 1) - cardSprite.width / 2;
            cardSprite.y = -5;
            cardSprite.index = i;
            table.decorateCardBehavior(cardSprite, i);
            this.cardSprites.push(cardSprite);
        }

        // Check if there are selected cards. If so, raise them up.
        const grab = table.tableState.grabbing.get(this.id);
        if (grab && grab.indices && grab.fromId === this.id) {
            for (let index of grab.indices) {
                const cardSprite = this.cardSprites[index];
                if (cardSprite) {
                    cardSprite.y = -20;
                }
            }
        }
    }

    public getCardSprite(index: number): CardSprite | undefined {
        return this.cardSprites[index];
    }

    public onResize(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;

        if (this.backgroundSprite && this.barNineSliceSprite) {
            this.backgroundSprite.width = this.screenWidth;
            this.backgroundSprite.height = this.screenHeight * 0.13;
            this.barNineSliceSprite.width = this.screenWidth;
        }

        this.y = height * 0.87;

        let l = this.cardSprites.length;
        for (let i = 0; i < l; i++) {
            let cardSprite = this.cardSprites[i]!;
            cardSprite.x = (i + 1) * this.screenWidth / (l + 1) - cardSprite.width / 2;
            cardSprite.y = 24;
        }
    }

    public onDragRelease(table: TableEngine, event: FederatedPointerEvent) {
        // Don't need to convert from global positions because we're always screen width
        const insertionIndex = Math.floor((this.cardSprites.length + 1) * event.globalX / this.screenWidth);
        table.tableNetwork.tableCall({
            methodName: "moveCards",
            opts: {
                playerId: table.tableNetwork.myself.id,
                toId: this.id,
                insertAt: insertionIndex
            }
        });
    }

    public onTapRelease(table: TableEngine,
                        event: FederatedPointerEvent,
                        previouslyGrabbed: boolean,
                        index: number) {
        console.log("onTapRelease called");
        console.log(index);
        console.log(previouslyGrabbed);
        if (previouslyGrabbed) {
            const grab = table.tableState.grabbing.get(this.id);
            if (grab) {
                const newSelection = this.updateSelection(index, grab.indices);
                if (newSelection.length > 0) {
                    console.log(newSelection)
                    table.tableNetwork.tableCall({
                        methodName: "select",
                        opts: {
                            playerId: table.tableNetwork.myself.id,
                            indices: newSelection
                        }
                    });
                } else {
                    table.tableNetwork.tableCall({
                        methodName: "release",
                        opts: {
                            playerId: table.tableNetwork.myself.id,
                        }
                    });
                }
            }  
        } else {
            const globalPos = this.toGlobal({x: 0, y: 0});
            table.tableNetwork.committedTableCall({
                methodName: "grab",
                opts: {
                    playerId: table.tableNetwork.myself.id,
                    newId: randomId(),
                    fromId: this.id,
                    initialWorldX: globalPos.x,
                    initialWorldY: globalPos.y,
                    selecting: true,
                    indices: [index]
                }
            });
        }
    }

    // Deselect an index if it's already been selected, select it if it's new
    private updateSelection(newIndex: number, selectedIndices?: number[]): number[] {
        if (!selectedIndices || selectedIndices.length === 0) {
            return [newIndex];
        }
        const result: number[] = [];
        let added = false;
        for (let i = 0; i < selectedIndices.length; i++) {
            if (selectedIndices[i]! > newIndex) {
                if (!added) {
                    result.push(newIndex);
                    added = true;
                }
                result.push(selectedIndices[i]!);
            } else if (selectedIndices[i]! < newIndex) {
                result.push(selectedIndices[i]!);
            } else if (selectedIndices[i]! === newIndex) {
                added = true;
            }
        }
        if (!added) {
            result.push(newIndex);
        }
        return result;
    }
}