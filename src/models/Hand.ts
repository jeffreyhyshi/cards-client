import { Card } from "./Card";
import { type TableEntity } from "./TableEntity";

export class Hand implements TableEntity {
    public entityId: string;
    private cards: Card[] = [];

    constructor(entityId: string, cardOrCards: Card | Card[]) {
        if (Array.isArray(cardOrCards)) {
            this.cards = cardOrCards;
        } else {
            this.cards.push(cardOrCards);
        }
        this.entityId = entityId
    }
}