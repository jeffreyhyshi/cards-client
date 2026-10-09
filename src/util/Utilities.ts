import type { Container, Point } from "pixi.js";
import { isResizable } from "../sprites/ResizableSprite";
import type { CardSprite } from "../sprites/CardSprite";

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

export function flipCardSprite(sprite: CardSprite, completion: number) {
    let toShow = sprite.front;
    let toHide = sprite.back;
    if (!sprite.card.faceUp) {
        toShow = sprite.back;
        toHide = sprite.front;
    }
    if (toHide && toShow) {
        if (completion <= 0.5) {
            toHide.visible = true;
            toShow.visible = false;

        } else {
            toHide.visible = false;
            toShow.visible = true;
        }
        toHide.scale.x = Math.max(0, 1 - completion / 0.5);
        toShow.scale.x = Math.min(1, completion / 0.5);
    }
}