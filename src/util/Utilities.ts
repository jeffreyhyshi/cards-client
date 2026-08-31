import type { Container } from "pixi.js";
import { isResizable } from "../sprites/ResizableSprite";

export function randomId() {
    return (Math.random().toString(36)).substring(2, 8);
}

export function recursiveResize(container: Container, width: number, height: number) {
    if (isResizable(container)) {
        container.onResize(width, height);
        return;
    }
    for (let child of container.children) {
        recursiveResize(child, width, height);
    }
}

export function arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}