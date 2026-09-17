import { Container, NineSliceSprite, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { TableShell } from '../TableShell';
import type { ResizableSprite } from './ResizableSprite';
import type { TableSprite } from './TableSprite';
import { Hand } from '../models/Hand';
import { CardSprite } from './CardSprite';

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

    public redraw(table: TableShell) {
        this.removeChildren();

        this.y = this.screenHeight * 0.8;

        this.backgroundSprite = new TilingSprite({
            texture: Texture.from('hand_grid.png'),
            width: this.screenWidth,
            height: this.screenHeight * 0.2
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
            cardSprite.y = 24;
            cardSprite.index = i;
            table?.decorateCardBehavior(this, cardSprite, i);
            this.cardSprites.push(cardSprite);
        }
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

    public reactHover(table: TableShell, other: TableSprite) {
    }

    public onResize(width: number, height: number) {
        this.screenWidth = width;
        this.screenHeight = height;

        if (this.backgroundSprite && this.barNineSliceSprite) {
            this.backgroundSprite.width = this.screenWidth;
            this.backgroundSprite.height = this.screenHeight * 0.2;
            this.barNineSliceSprite.width = this.screenWidth;
        }

        this.y = height * 0.8;

        let l = this.cardSprites.length;
        for (let i = 0; i < l; i++) {
            let cardSprite = this.cardSprites[i]!;
            cardSprite.x = (i + 1) * this.screenWidth / (l + 1) - cardSprite.width / 2;
            cardSprite.y = 24;
        }
    }
}