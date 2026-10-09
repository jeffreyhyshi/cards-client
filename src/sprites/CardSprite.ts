import { Text, BitmapText, FederatedPointerEvent, Sprite, Texture, Container, type TickerCallback, Rectangle } from 'pixi.js'
import { type Card, Suits } from '../models/Card';
import type { PointerEventSprite } from './PointerEventSprite';
import type { TableSprite } from './TableSprite';
import type { TableShell } from '../TableShell';

export class CardSprite extends Container implements PointerEventSprite {
    public type: "card" = "card";
    public id: string;
    public card: Card;
    public index?: number;

    public onDown?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onMove?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onRelease?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onMoveStart?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    public onTap?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;

    public front?: Sprite;
    public back?: Sprite;
    protected suitSprite?: Sprite;
    protected rankText?: Text | BitmapText;

    private firstDrag: boolean;

    private currentAnimation?: TickerCallback<any>;

    static isCardSprite(o: TableSprite): o is CardSprite {
        return o.type === "card";
    }
    
    constructor(entityId: string, card: Card) {
        super();
        this.id = entityId;
        this.card = card;

        this.firstDrag = true;
        this.initPointerEventCallbacks();
        this.draw();
    }

    public draw() {
        this.removeChildren();
        this.populateFront();
        this.populateBack();
        this.front!.pivot.set(this.front!.width / 2, 0);
        this.front!.x = this.front!.width / 2;
        this.addChild(this.front!);
        this.back!.pivot.set(this.back!.width / 2, 0);
        this.back!.x = this.back!.width / 2;
        this.addChild(this.back!);

        // Should be the same size back and front
        this.hitArea = new Rectangle(0, 0, this.front!.width, this.front!.height);

        if (this.card.faceUp) {
            this.front!.visible = true;
            this.back!.visible = false;
        } else {
            this.front!.visible = false;
            this.back!.visible = true;
        }
        this.eventMode = "dynamic";
        this.interactiveChildren = false;
    }

    // public animateRedraw(table: TableShell) {
    //     console.log("in animateRedraw");
    //     this.removeChildren();
    //     if (!this.card.faceUp && this.front && !this.back) {
    //         // Populate back
    //         this.populateBack();
    //         this.back!.pivot.set(this.back!.width / 2, 0);
    //         this.back!.x = this.back!.width / 2;
    //         this.back!.scale.x = 0;
    //         this.addChild(this.front);
    //         this.addChild(this.back!);
            
    //         // Flip from face up to face down
    //         this.currentAnimation = (ticker) => {
    //             if (this.front && this.front.scale.x > 0) {
    //                 let nextXScale = this.front.scale.x - 0.2 * ticker.deltaTime;
    //                 nextXScale = Math.max(0, nextXScale);
    //                 this.front.scale.x = nextXScale;
    //             } else if (this.back && this.back.scale.x < 1) {
    //                 let nextXScale = this.back.scale.x + 0.2 * ticker.deltaTime;
    //                 nextXScale = Math.min(1, nextXScale);
    //                 this.back.scale.x = nextXScale;
    //             } else {
    //                 if (this.currentAnimation) {
    //                     this.front?.destroy();
    //                     delete this.front;
    //                     table.app.ticker.remove(this.currentAnimation);
    //                     delete this.currentAnimation;
    //                 }
    //             }
    //         };
    //         table.app.ticker.add(this.currentAnimation);
    //     } else if (this.card.faceUp && this.back && !this.front) {
    //         // Populate front
    //         this.populateFront();
    //         this.front!.pivot.set(this.back.width / 2, 0);
    //         this.front!.x = this.back.width / 2;
    //         this.front!.scale.x = 0;
    //         this.addChild(this.front!);
    //         this.addChild(this.back);

    //         // Flip from face up to face down
    //         this.currentAnimation = (ticker) => {
    //             if (this.back && this.back.scale.x > 0) {
    //                 let nextXScale = this.back.scale.x - 0.2 * ticker.deltaTime;
    //                 nextXScale = Math.max(0, nextXScale);
    //                 this.back.scale.x = nextXScale;
    //             } else if (this.front && this.front.scale.x < 1) {
    //                 let nextXScale = this.front.scale.x + 0.2 * ticker.deltaTime;
    //                 nextXScale = Math.min(1, nextXScale);
    //                 this.front.scale.x = nextXScale;
    //             } else {
    //                 if (this.currentAnimation) {
    //                     this.back?.destroy();
    //                     delete this.back;
    //                     table.app.ticker.remove(this.currentAnimation);
    //                     delete this.currentAnimation;
    //                 }
    //             }
    //         };
    //         table.app.ticker.add(this.currentAnimation);
    //     } else {
    //         console.log("fellback from animateRedraw");
    //         console.log(this.card.faceUp);
    //         console.log(this.back);
    //         console.log(this.front);



    //         this.draw();
    //     }
    //     this.eventMode = "dynamic";
    //     this.interactiveChildren = false;
    // }

    protected populateBack() {
        this.back?.destroy();
        this.back = new Sprite(Texture.from("card_back.png"));
    }

    protected populateFront() {
        this.front?.destroy();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.front = new Sprite(Texture.from("card.png"));

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.front.addChild(this.suitSprite);
        this.suitSprite.x = 7;
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
        this.front.addChild(this.rankText);
        this.rankText.x = 13;
        this.rankText.y = -12;
    }

    // Always returns itself
    public getCardSprite(_: number): CardSprite {
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
            if (this.onDown) {
                this.onDown(this, event);
            }
        });
        this.on('pointermove', (event) => {
            if (this.onMove) {
                if (this.firstDrag) {
                    this.firstDrag = false;
                    if (this.onMoveStart) {
                        this.onMoveStart(this, event);
                    }
                }
                this.onMove(this, event);
            }
        });
        this.on('pointerup', (event => {
            this.firstDrag = true;
            if (this.onRelease) {
                this.onRelease(this, event);
            }
        }));
        this.on('pointerupoutside', (event => {
            this.firstDrag = true;
            if (this.onRelease) {
                this.onRelease(this, event);
            }
        }));
    }
}
