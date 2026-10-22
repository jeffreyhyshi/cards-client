import type { TableSprite } from "../sprites/TableSprite";
import type { TableEngine } from "../TableEngine";
import { flipCardSprite } from "../util/Utilities";
import type { TableAnimation } from "./TableAnimation";

export class HandCardFlipAnimation implements TableAnimation<TableSprite> {
    public completion = 0;
    public grabbedEntityId: string;
    public indices: number[];

    constructor(grabbedEntityId: string, indices: number[]) {
        this.grabbedEntityId = grabbedEntityId;
        this.indices = indices;
    }

    public selectTarget(tableEngine: TableEngine): TableSprite | undefined {
        return tableEngine.sprites.get(this.grabbedEntityId);
    }

    public animate(handSprite: TableSprite) {
        for (let i of this.indices) {
            let card = handSprite.getCardSprite(i);
            if (card) {
                flipCardSprite(card, this.completion);
            }
        }        

        this.completion += 0.1;
    }
}