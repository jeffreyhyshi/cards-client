import { Container } from "pixi.js";
import type { TableSprite } from "./TableSprite";
import type { TableShell } from "../TableShell";
import type { Hand } from "../models/Hand";

export class HandSprite extends Container implements TableSprite {
    public type: "otherhand" = "otherhand"
    public id: string;
    reactHover?: (table: TableShell, other: TableSprite) => void;
    reactRelease?: (table: TableShell, other: TableSprite) => void;
    
    constructor(hand: Hand) {
        super();
        this.id = hand.playerId
    }

    public redraw(table?: TableShell) {

    }

    public getCardSprite(indices: number[]): TableSprite | undefined {
        return;
    }
}