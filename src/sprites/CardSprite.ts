import { BitmapText, Sprite, Texture } from 'pixi.js'
import { type Card, Suits } from '../models/Card';
import type { TableEntity } from '../models/TableEntity';
import type { Table } from '../Table';

export class CardSprite extends Sprite implements TableEntity {
    public entityId: string;
    public card: Card;

    private suitSprite: Sprite;
    private rankBitmapText: BitmapText;

    public dragging: boolean;
    
    constructor(entityId: string, card: Card) {
        super(Texture.from('card.png'));
        this.entityId = entityId;
        this.card = card;
        
        this.suitSprite = new Sprite(CardSprite.getSuitTexture(card));
        this.addChild(this.suitSprite);
        this.suitSprite.x = 5;
        this.suitSprite.y = 25;

        this.rankBitmapText = new BitmapText({
            text: CardSprite.getRankText(card),
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: CardSprite.getSuitColor(card)
            }
        });
        this.addChild(this.rankBitmapText);
        this.rankBitmapText.x = 5;
        this.rankBitmapText.y = -12;

        this.eventMode = "dynamic";
        this.interactiveChildren = false;

        this.dragging = false;
        this.initializeDraggability();
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

    public enregister(table: Table) {
        setInterval(() => {
            if (this.dragging) {
                table.broadcast(this.x, this.y, this.entityId);
            }
        }, 20);
    }

    private initializeDraggability() {
        this.on('pointerdown', (event) => {
            this.dragging = true;
        });
        this.on('globalpointermove', (event) => {
            if (this.dragging) {
                this.x += event.movementX;
                this.y += event.movementY;
            }
        });
        this.on('pointerup', (event => {
            this.dragging = false;
        }));
        this.on('pointerupoutside', (event => {
            this.dragging = false;
        }));
    }
}
