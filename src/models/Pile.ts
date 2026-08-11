import { Card, MIN_RANK, MAX_RANK, type Rank, type Suit, Suits } from "./Card";
import { type TableEntity } from "./TableEntity";

interface DrawCardsOptions {
    n: number;
}

// Models a pile of cards
export class Pile implements TableEntity {
    public entityId: string;
    private cards: Card[] = [];

    public drawCards({n = 1}: DrawCardsOptions): Card[] {
        let result = this.cards.slice(0, Math.min(this.cards.length, n));
        this.cards.splice(0, n);
        return result;
    }

    public addCards() {

    }

    static freshDeck(entityId: string): Pile {
        let cards = [];
        let suit: Suit;
        for (suit of Object.values(Suits)) {
            for (let i = MIN_RANK; i <= MAX_RANK; i++) {
                cards.push(new Card(suit, i as Rank));
            }
        }

        return new Pile(entityId, cards);
    }

    constructor(entityId: string, cardOrCards: Card | Card[]) {
        if (Array.isArray(cardOrCards)) {
            this.cards = cardOrCards;
        } else {
            this.cards.push(cardOrCards);
        }
        this.entityId = entityId;
    }
}