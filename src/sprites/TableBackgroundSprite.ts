import { Texture, TilingSprite } from "pixi.js";
import type { ResizableSprite } from "./ResizableSprite";

export class TableBackgroundSprite extends TilingSprite implements ResizableSprite {
    constructor(w: number, h: number) {
        super({
            texture: Texture.from("bg.png")
        });
        this.width = w;
        this.height = h;
    }

    public onResize (w: number, h: number) {
        this.width = w;
        this.height = h;
    }
    
}