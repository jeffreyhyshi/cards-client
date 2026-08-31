import type { TableEntityType, TableStateEntity } from "../TableState";
import type { Card } from "./Card";

export class Hand implements TableStateEntity {
    public type: TableEntityType = "hand";
    public cards: Card[] = [];
    public playerId: string

    static isHand(o: TableStateEntity): o is Hand {
        return o.type === "hand";
    }

    constructor(playerId: string) {
        this.playerId = playerId;
    }
}