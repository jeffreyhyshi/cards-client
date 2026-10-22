import type { Container, FederatedPointerEvent } from "pixi.js";
import type { TableEngine } from "../TableEngine";
import type { CardSprite } from "./CardSprite";

export interface TableSprite extends Container {
    type: "pile" | "ownhand" | "otherhand" | "card";
    id: string;
    getCardSprite: (index: number) => CardSprite | undefined;
    // Handles being released from dragging. The last parameter represents whether this entity
    // was already grabbed when the tap event was initiated (i.e. at pointer down).
    onTapRelease?: (table: TableEngine, event: FederatedPointerEvent, previouslyGrabbed: boolean, index: number) => void;
    onDragRelease?: (table: TableEngine, event: FederatedPointerEvent) => void;
    onDragHover?: (table: TableEngine, event: FederatedPointerEvent) => void;
    // Handles initial move logic, e.g. if there are selected indices in the current grab.
    onInitialMove?: (table: TableEngine, event: FederatedPointerEvent) => void;
    draw: (table: TableEngine) => void;
}