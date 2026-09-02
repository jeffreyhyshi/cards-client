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
        this.removeChildren();

        this.pileSprites = [];
        // For every five cards remaining in the pile, draw a stacked "card" to indicate quantity
        let i = 0;
        for (; i < Math.floor(this.pile.cards.length / 10); i++) {
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
                this.nextCardSprite.index = 1;
            }
            this.topCardSprite = new CardSprite(this.id, this.pile.cards[0]!);
            this.addChild(this.topCardSprite);
            this.topCardSprite.x = -3 * i;
            this.topCardSprite.y = -3 * i;
            this.topCardSprite.index = 0;
        }
        if (this.topCardSprite) {
            table?.decorateCardBehavior(this, this.topCardSprite);
        }
    }

    public reactRelease(table: TableShell, other?: TableSprite) {
        if (other && CardSprite.isCardSprite(other)) {
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

    public getCardSprite(indices: number[]): TableSprite | undefined {
        if (indices.length === 1 && indices[0] === 0 && this.topCardSprite) {
            return this.topCardSprite;
        } else {
            // TODO: Fix behavior for multi-card selection
            const result: CardSprite[] = []
            for (let i = 0; i < indices.length; i++) {
                const index = indices[i];
                if (index && index === 0 && this.topCardSprite) {
                    result.push(this.topCardSprite);
                } else if (index && index === 0 && this.nextCardSprite) {
                    result.push(this.nextCardSprite);
                }
            }
            return this;
        }
    }
}