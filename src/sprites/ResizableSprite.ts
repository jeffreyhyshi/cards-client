import { type Container } from 'pixi.js';

export interface ResizableSprite extends Container {
    onResize: (w: number, h: number) => void;
}

export function isResizable(obj: Container): obj is ResizableSprite {
    return "onResize" in obj &&
            typeof (obj as ResizableSprite).onResize === "function";
}