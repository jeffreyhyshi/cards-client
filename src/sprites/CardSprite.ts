import { Text, BitmapText, FederatedPointerEvent, Sprite, Texture } from 'pixi.js'
import { type Card, Suits } from '../models/Card';
import type { PointerEventSprite } from './PointerEventSprite';
import type { TableSprite } from './TableSprite';

export type CardSpriteSize = "m" | "s" | "xs";

export class CardSprite extends Sprite implements PointerEventSprite {
    public type: "card" = "card";
    public id: string;
    public card: Card;
    public index?: number;

    public draggable: boolean;
    public dragging: boolean;
    public get size(): CardSpriteSize {
        return this._size;
    }
    public set size(s: CardSpriteSize) {
        this._size = s;
        this.redraw();
    }

    public onDown?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onMove?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onRelease?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onMoveStart?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onTap?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;

    private suitSprite?: Sprite;
    private rankText?: Text | BitmapText;
    private firstDrag: boolean;
    private _size: CardSpriteSize;

    static isCardSprite(o: TableSprite): o is CardSprite {
        return o.type === "card";
    }
    
    constructor(entityId: string, card: Card, size: CardSpriteSize = "m") {
        super(Texture.from("card.png"));
        this.id = entityId;
        this.card = card;
        this._size = size;

        this.dragging = false;
        this.draggable = false;
        this.firstDrag = true;
        this.initPointerEventCallbacks();
        this.redraw();
    }

    public redraw() {
        if (this.size === "m") {
            this.redrawMedium();
        } else if (this.size === "s") {
            this.redrawSmall();
        } else if (this.size === "xs") {
            this.redrawExtraSmall();
        }
    }

    public redrawMedium() {
        this.removeChildren();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.addChild(this.suitSprite);
        this.suitSprite.x = 7;
        this.suitSprite.y = 25;

        this.rankText = new BitmapText({
            text: CardSprite.getRankText(this.card),
            anchor: {x: 0.5, y :0},
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: CardSprite.getSuitColor(this.card),
                letterSpacing: -2
            }
        });
        this.addChild(this.rankText);
        this.rankText.x = 13;
        this.rankText.y = -12;

        this.eventMode = "dynamic";
        this.interactiveChildren = false;
    }

    public redrawSmall() {
        this.texture = Texture.from("mini_card.png");

        this.removeChildren();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.addChild(this.suitSprite);
        this.suitSprite.x = 6;
        this.suitSprite.y = 25;

        this.rankText = new BitmapText({
            text: CardSprite.getRankText(this.card),
            anchor: { x: 0.5, y: 0 },
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: CardSprite.getSuitColor(this.card),
                letterSpacing: -2
            }
        });
        this.addChild(this.rankText);
        this.rankText.x = 13;
        this.rankText.y = -12;

        this.eventMode = "dynamic";
        this.interactiveChildren = false;
    }

    public redrawExtraSmall() {
        this.texture = Texture.from("nano_card.png");

        this.removeChildren();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.suitSprite.width = 8;
        this.suitSprite.height = 8;
        this.addChild(this.suitSprite);
        this.suitSprite.x = 6;
        this.suitSprite.y = 18;

        this.rankText = new BitmapText({
            text: CardSprite.getRankText(this.card),
            anchor: { x: 0.55, y: 0 }, // Don't worry about it
            roundPixels: true,
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 20,
                fill: CardSprite.getSuitColor(this.card),
                letterSpacing: -2
            }
        });
        this.addChild(this.rankText);
        this.rankText.x = 9;
        this.rankText.y = -7;

        this.eventMode = "dynamic";
        this.interactiveChildren = false;
    }

    // Always returns itself
    public getCardSprite(_: number[]): TableSprite {
        return this;
    }

    static getSuitColor(card: Card): number {
        switch (card.suit) {
            case Suits.Spades:
                return 0x0;
            case Suits.Clubs:
                return 0x5e1d5e;
            case Suits.Diamonds:
                return 0xe35300;
            case Suits.Hearts:
                return 0xEB1C50;
        }
    }

    static getRankText(card: Card): string {
        switch (card.rank) {
            case 1:
                return 'A';
            case 11:
                return 'J';
            case 12:
                return 'Q';
            case 13:
                return 'K';
            default:
                return card.rank.toString();
        }
    }

    static getSuitTexture(card: Card): Texture {
        switch (card.suit) {
            case Suits.Spades:
                return Texture.from('spade.png');
            case Suits.Clubs:
                return Texture.from('club.png');
            case Suits.Diamonds:
                return Texture.from('diamond.png');
            case Suits.Hearts:
                return Texture.from('heart.png');
        }
    }

    private initPointerEventCallbacks() {
        this.on('pointertap', (event) => {
            if (this.onTap) {
                this.onTap(this, event);
            }
        })
        this.on('pointerdown', (event) => {
            this.dragging = true;
            if (this.onDown) {
                this.onDown(this, event);
            }
        });
        this.on('globalpointermove', (event) => {
            if (this.dragging && this.draggable) {
                // this.x += event.movementX;
                // this.y += event.movementY;
                if (this.onMove) {
                    if (this.firstDrag) {
                        this.firstDrag = false;
                        if (this.onMoveStart) {
                            this.onMoveStart(this, event);
                        }
                    }
                    this.onMove(this, event);
                }
            }
        });
        this.on('pointerup', (event => {
            this.dragging = false;
            this.firstDrag = true;
            if (this.onRelease) {
                this.onRelease(this, event);
            }
        }));
        this.on('pointerupoutside', (event => {
            this.dragging = false;
            this.firstDrag = true;
            if (this.onRelease) {
                this.onRelease(this, event);
            }
        }));
    }
}
