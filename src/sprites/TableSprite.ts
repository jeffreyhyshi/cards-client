import type { Container } from "pixi.js";
import type { TableShell } from "../TableShell";

export interface TableSprite extends Container {
    type: "pile" | "ownhand" | "otherhand" | "card";
    id: string;
    redraw: (table?: TableShell) => void;
    reactHover?: (table: TableShell, other?: TableSprite) => void;
    reactRelease?: (table: TableShell, other?: TableSprite) => void;
}