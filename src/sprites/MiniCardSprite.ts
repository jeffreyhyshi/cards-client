import { BitmapText, Sprite, Texture } from "pixi.js";
import { CardSprite } from "./CardSprite";

export class MiniCardSprite extends CardSprite {
    protected populateFront() {
        this.front?.destroy();
        this.suitSprite?.destroy();
        this.rankText?.destroy();

        this.front = new Sprite(Texture.from("mini_card.png"));

        this.suitSprite = new Sprite(CardSprite.getSuitTexture(this.card));
        this.front.addChild(this.suitSprite);
        this.suitSprite.x = 6;
        this.suitSprite.y = 25;

        this.rankText = new BitmapText({
            text: CardSprite.getRankText(this.card),
            anchor: { x: 0.5, y: 0 },
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: CardSprite.getSuitColor(this.card),
                letterSpacing: -2
            }
        });
        this.front.addChild(this.rankText);
        this.rankText.x = 13;
        this.rankText.y = -12;
    }

    protected populateBack() {
        this.back?.destroy();
        this.back = new Sprite(Texture.from("mini_card_back.png"));
    }
}