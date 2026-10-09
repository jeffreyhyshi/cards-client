import type { Container } from "pixi.js";
import type { TableEngine } from "../TableEngine";
import type { CardSprite } from "./CardSprite";

export interface TableSprite extends Container {
    type: "pile" | "ownhand" | "otherhand" | "card";
    id: string;
    getCardSprite: (index: number) => CardSprite | undefined;
    draw: (table: TableEngine) => void;
}