import { Container, FederatedPointerEvent, Sprite, Texture } from 'pixi.js'
import type { TableShell } from '../TableShell';
import type { Pile } from '../models/Pile';
import { CardSprite } from './CardSprite';
import type { TableSprite } from './TableSprite';
import type { PointerEventSprite } from './PointerEventSprite';

// Sprite representing a pile of cards.
// Contains card backgrounds and CardSprites as necessary
export class PileSprite extends Sprite implements TableSprite {
    public type: "pile" = "pile";
    public id: string;
    public pile: Pile;

    // TODO: Fix the interface here so that we can arbitrarily "pick up" a sprite representing the top N cards
    public topCardSprite?: CardSprite;
    public nextCardSprite?: CardSprite;
    public pileSprites: Sprite[] = [];

    static isPileSprite(s: TableSprite): s is PileSprite {
        return s.type === "pile";
    }

    constructor(entityId: string, pile: Pile) {
        super();
        this.id = entityId;
        this.pile = pile;
        this.redraw();
    }

    public redraw(table?: TableShell) {
        console.log("redraw called, table: ");
        console.log(table);
        this.removeChildren();
        this.topCardSprite?.destroy();
        this.nextCardSprite?.destroy();

        for (let pileSprite of this.pileSprites) {
            pileSprite.destroy();
        }
        delete this.topCardSprite;
        delete this.nextCardSprite;
        this.pileSprites = [];
        // For every five cards remaining in the pile, draw a stacked "card" to indicate quantity
        let i = 0;
        for (; i < Math.floor(this.pile.cards.length / 5); i++) {
            let pileSprite = new Sprite(Texture.from('card.png'));
            this.addChild(pileSprite);
            pileSprite.x = -3 * i;
            pileSprite.y = -3 * i;
            this.pileSprites.splice(0, 0, pileSprite);
        }
        if (this.pile.cards.length > 0) {            
            if (this.pile.cards.length > 1) {
                this.nextCardSprite = new CardSprite(this.id, this.pile.cards[1]!);
                this.addChild(this.nextCardSprite);
                this.nextCardSprite.x = -3 * i;
                this.nextCardSprite.y = -3 * i;
                i += 1;
            }
            this.topCardSprite = new CardSprite(this.id, this.pile.cards[0]!);
            this.addChild(this.topCardSprite);
            this.topCardSprite.x = -3 * i;
            this.topCardSprite.y = -3 * i;
        }
        if (this.topCardSprite) {
            table?.decorateCardBehavior(this, this.topCardSprite);
        }
    }
}