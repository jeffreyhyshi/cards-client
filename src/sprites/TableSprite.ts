import type { Container } from "pixi.js";
import type { TableShell } from "../TableShell";
import type { CardSprite } from "./CardSprite";

export interface TableSprite extends Container {
    type: "pile" | "ownhand" | "otherhand" | "card";
    id: string;
    getCardSprite: (indices: number[]) => TableSprite | undefined;
    redraw: (table?: TableShell) => void;
    reactHover?: (table: TableShell, other?: TableSprite) => void;
    reactRelease?: (table: TableShell, other?: TableSprite) => void;
}