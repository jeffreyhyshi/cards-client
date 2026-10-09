import type { TableEntityType, TableStateEntity } from "../TableState";
import { Card, MAX_RANK, MIN_RANK, Suits, type Rank, type Suit } from "./Card";

export class Pile implements TableStateEntity {
    public type: TableEntityType = "pile";
    public cards: Card[];
    public gridX: number;
    public gridY: number;
    public fromId?: string;

    static isPile(o: TableStateEntity): o is Pile {
        return o.type === "pile";
    }

    static newDeck(gridX: number, gridY: number): Pile {
        let cards = [];
        let suit: Suit;
        for (suit of Object.values(Suits)) {
            for (let i = MIN_RANK; i <= MAX_RANK; i++) {
                cards.push(new Card(suit, i as Rank));
            }
        }
        return new Pile(gridX, gridY, cards);
    }

    constructor(gridX: number, gridY: number, cards: Card[]) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.cards = cards;
    }
}