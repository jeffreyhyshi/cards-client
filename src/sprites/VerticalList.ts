import { Container } from "pixi.js";

// Implements a vertical list centered at its local origin.
export class VerticalList extends Container {
    private _spacing: number;
    private _align: "left" | "right";

    constructor(spacing: number, align: "left" | "right") {
        super();
        this._spacing = spacing;
        this._align = align;
    }

    public get spacing(): number {
        return this._spacing;
    }

    public set spacing(spacing: number) {
        this._spacing = spacing;
        this.onChange()
    }

    public get align(): "left" | "right" {
        return this._align;
    }

    public set align(spacing: "left" | "right") {
        this._align = spacing;
        this.onChange()
    }

    public addChild(...children: Container[]): Container {
        let result: Container = super.addChild(...children);
        this.onChange();
        return result;
    }

    public addChildAt<U extends Container>(child: Container, index: number): U {
        let result: U = super.addChildAt(child, index) as U;
        this.onChange();
        return result;
    }

    public removeChild(...children: Container[]): Container {
        let result: Container = super.removeChild(...children);
        this.onChange();
        return result;
    }

    private onChange() {
        let count = this.children.length;

        let totalHeight = this.spacing * (count - 1);
        for (let i = 0; i < count; i++) {
            totalHeight += this.children[i]!.height;
        }
        let curY = Math.round(-totalHeight / 2);
        let x: number = 0;
        for (let i = 0; i < count; i++) {
            if (this.align == "right") {
                x = -this.children[i]!.width;
            }
            this.children[i]!.y = curY;
            curY += this.children[i]!.height + this.spacing;
            this.children[i]!.x = x;
        }
    }
}