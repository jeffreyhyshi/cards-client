import type { FederatedPointerEvent } from "pixi.js";
import type { TableSprite } from "./TableSprite";

export interface PointerEventSprite extends TableSprite {
    onDown?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    onMove?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    onMoveStart?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    onRelease?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
    onTap?: (s: PointerEventSprite, e: FederatedPointerEvent) => void;
}