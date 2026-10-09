import type { GrabOpts, TableEntityType, TableStateEntity } from "../TableState";
import type { Card } from "./Card";

export class LooseCards implements TableStateEntity {
    public type: TableEntityType = "loose";
    public cards: Card[];
    public from: GrabOpts;
    public worldX: number;
    public worldY: number;

    static isLooseCards(o: TableStateEntity): o is LooseCards {
        return o.type === "loose";
    } 

    constructor(from: GrabOpts, cards: Card[], worldX: number, worldY: number) {
        this.cards = cards;
        this.from = from;
        this.worldX = worldX;
        this.worldY = worldY;
    }
}