import type { TableEntityType, TableStateEntity } from "../TableState";
import { Card, MAX_RANK, MIN_RANK, Suits, type Rank, type Suit } from "./Card";

export class Pile implements TableStateEntity {
    public type: TableEntityType = "pile";
    public cards: Card[];
    public worldX: number;
    public worldY: number;

    static isPile(o: TableStateEntity): o is Pile {
        return o.type === "pile";
    }

    static newDeck(worldX: number, worldY: number): Pile {
        let cards = [];
        let suit: Suit;
        for (suit of Object.values(Suits)) {
            for (let i = MIN_RANK; i <= MAX_RANK; i++) {
                cards.push(new Card(suit, i as Rank));
            }
        }
        return new Pile(worldX, worldY, cards);
    }

    constructor(worldX: number, worldY: number, cards: Card[]) {
        this.worldX = worldX;
        this.worldY = worldY;
        this.cards = cards;
    }
}