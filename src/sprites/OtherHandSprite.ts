import { Container, NineSliceSprite, Texture } from "pixi.js";
import type { TableSprite } from "./TableSprite";
import type { TableShell } from "../TableShell";
import type { Hand } from "../models/Hand";
import { CardSprite } from "./CardSprite";

export type OtherHandSpriteSize = "s" | "xs";

export class OtherHandSprite extends Container implements TableSprite {
    public type: "otherhand" = "otherhand";
    public id: string;
    public hand: Hand;

    public get size(): OtherHandSpriteSize {
        return this._size;
    }
    public set size(s: OtherHandSpriteSize) {
        this._size = s;
        this.redraw();
    }

    private barNineSliceSprite?: NineSliceSprite;
    private cardSprites: CardSprite[] = [];
    private _size: OtherHandSpriteSize;
    
    constructor(hand: Hand, size: OtherHandSpriteSize = "s") {
        super();
        this.id = hand.playerId
        this.hand = hand;
        this._size = size;
    }

    public redraw(table?: TableShell) {
        this.removeChildren();

        this.cardSprites = [];
        const startX = -Math.round(this.hand.cards.length * this.cardWidth() / 2);
        const l = this.hand.cards.length;
        for (let i = 0; i < l; i++) {
            let card = this.hand.cards[i]!;
            let cardSprite = new CardSprite(this.id, card, this._size);
            this.addChild(cardSprite);
            cardSprite.x = startX + i * this.cardWidth();
            cardSprite.y = 0;
            cardSprite.index = i;
            table?.decorateCardBehavior(this, cardSprite, i);
            this.cardSprites.push(cardSprite);
        }

        this.barNineSliceSprite = new NineSliceSprite({
            texture: Texture.from("other_bar.png"),
            topHeight: 2,
            bottomHeight: 5,
            leftWidth: 5,
            rightWidth: 5
        });
        this.addChild(this.barNineSliceSprite);

        if (this.cardSprites.length > 0) {
            this.barNineSliceSprite.x = startX;
            this.barNineSliceSprite.y = this.cardHeight() - 5;
            this.barNineSliceSprite.width = this.hand.cards.length * this.cardWidth();
        } else {
            this.barNineSliceSprite.x = -10;
            this.barNineSliceSprite.y = 0;
        }
        
    }

    private cardWidth(): number {
        if (this._size === "s") {
            return 30;
        } else if (this._size === "xs") {
            return 20;
        }
        return 0; // Unreachable
    }

    private cardHeight(): number {
        if (this._size === "s") {
            return 50;
        } else if (this._size === "xs") {
            return 30;
        }
        return 0; // Unreachable
    }

    public getCardSprite(indices: number[]): TableSprite | undefined {
        if (indices.length === 1) {
            const index = indices[0]!;
            return this.cardSprites[index];
        } else {
            // TODO: Fix behavior for multi-card selection
            const result = []
            for (let i = 0; i < indices.length; i++) {
                const index = indices[i];
                if (index && this.cardSprites[index]) {
                    result.push(this.cardSprites[index]);
                }
            }
            return this;
        }

    }

    public reactHover(table: TableShell, other: TableSprite) {

    }

    public reactRelease(table: TableShell, other: TableSprite) {
        if (CardSprite.isCardSprite(other)) {
            table.tableNetwork.tableCall({
                methodName: "moveCards",
                opts: {
                    playerId: table.tableNetwork.myself.id,
                    fromId: other.id,
                    toId: this.id,
                    indices: [other.index ?? 0]
                }
            });
            other.id = this.id;
        }
    };
}