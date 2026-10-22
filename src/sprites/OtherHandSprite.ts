import { Container, FederatedPointerEvent, NineSliceSprite, Texture } from "pixi.js";
import type { TableSprite } from "./TableSprite";
import type { TableShell } from "../TableShell";
import type { Hand } from "../models/Hand";
import { CardSprite } from "./CardSprite";
import type { Card } from "../models/Card";
import { MiniCardSprite } from "./MiniCardSprite";
import { MicroCardSprite } from "./MicroCardSprite";
import type { TableEngine } from "../TableEngine";

export type OtherHandSpriteSize = "s" | "xs";

export class OtherHandSprite extends Container implements TableSprite {
    public type: "otherhand" = "otherhand";
    public id: string;
    public hand: Hand;

    public get size(): OtherHandSpriteSize {
        return this._size;
    }

    private barNineSliceSprite?: NineSliceSprite;
    private cardSprites: CardSprite[] = [];
    private _size: OtherHandSpriteSize;

    static isOtherHandSprite(s: TableSprite): s is OtherHandSprite {
        return s.type === "otherhand";
    }
    
    constructor(hand: Hand, size: OtherHandSpriteSize = "s") {
        super();
        this.id = hand.playerId
        this.hand = hand;
        this._size = size;
    }

    public draw(table: TableEngine) {
        this.removeChildren();

        this.cardSprites = [];
        const startX = -Math.round(this.hand.cards.length * this.cardWidth() / 2);
        const l = this.hand.cards.length;
        for (let i = 0; i < l; i++) {
            let card = this.hand.cards[i]!;
            let cardSprite = this.sizedSprite(this.id, card);
            this.addChild(cardSprite);
            cardSprite.x = startX + i * this.cardWidth();
            cardSprite.y = 0;
            cardSprite.index = i;
            table.decorateCardBehavior(cardSprite, i);
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

    public onDragRelease(table: TableEngine, _event: FederatedPointerEvent) {
        table.tableNetwork.tableCall({
            methodName: "moveCards",
            opts: {
                playerId: table.tableNetwork.myself.id,
                toId: this.id
            }
        });
    }

    public getCardSprite(index: number): CardSprite | undefined {
        return this.cardSprites[index];
    }

    private sizedSprite(id: string, card: Card): CardSprite {
        if (this._size == "s") {
            return new MiniCardSprite(id, card);
        } else {
            return new MicroCardSprite(id, card);
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
}