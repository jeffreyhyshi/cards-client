import { BitmapText, Sprite, Texture } from "pixi.js";
import { CardSprite } from "./CardSprite";

export class MicroCardSprite extends CardSprite {
    protected populateFront() {
        this.front?.destroy();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.front = new Sprite(Texture.from("micro_card.png"));

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.suitSprite.width = 8;
        this.suitSprite.height = 8;
        this.front.addChild(this.suitSprite);
        this.suitSprite.x = 6;
        this.suitSprite.y = 18;

        this.rankText = new BitmapText({
            text: CardSprite.getRankText(this.card),
            anchor: { x: 0.55, y: 0 }, // Don't worry about it
            roundPixels: true,
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 20,
                fill: CardSprite.getSuitColor(this.card),
                letterSpacing: -2
            }
        });
        this.front.addChild(this.rankText);
        this.rankText.x = 9;
        this.rankText.y = -7;
    }

    protected populateBack() {
        this.back?.destroy();
        this.back = new Sprite(Texture.from("micro_card_back.png"));
    }
}