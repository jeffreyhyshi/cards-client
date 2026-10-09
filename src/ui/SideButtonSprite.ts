import { BitmapText, NineSliceSprite, Sprite, Texture } from "pixi.js";

export interface SideButtonSpriteOptions {
    type: "card" | "table";
    iconSprite: Sprite;
    labelText: string;
}

export class SideButtonSprite extends NineSliceSprite {
    private iconSprite: Sprite;
    private text: BitmapText;

    constructor(opt: SideButtonSpriteOptions) {
        super({
            texture: Texture.from(opt.type + "_tab.png"),
            rightWidth: 7,
            leftWidth: 7,
            topHeight: 11,
            bottomHeight: 5,
            height: 64,
            width: 64
        });
        this.iconSprite = opt.iconSprite;
        this.addChild(this.iconSprite);
        this.iconSprite.height = 32;
        this.iconSprite.width = 32;
        this.iconSprite.x = 20;
        this.iconSprite.y = 10
        this.text = new BitmapText({
            text: opt.labelText,
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 14,
                fill: 0
            }
        });
        this.addChild(this.text);
        this.text.x = 15;
        this.text.y = 42;
    }
}