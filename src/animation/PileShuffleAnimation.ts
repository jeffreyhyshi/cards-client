import type { Card, Position } from "../models/Card";
import { CardSprite } from "../sprites/CardSprite";
import { PileSprite } from "../sprites/PileSprite";
import type { TableEngine } from "../TableEngine";
import type { TableAnimation } from "./TableAnimation";

export class PileShuffleAnimation implements TableAnimation<PileSprite> {
    public completion = 0;
    public grabbedEntityId: string;
    public prevCards: Card[];
    private origTopCardSprite?: CardSprite;
    private origTopCardPosition?: Position;

    constructor(grabbedEntityId: string, prevCards: Card[]) {
        this.grabbedEntityId = grabbedEntityId;
        this.prevCards = prevCards;
    }

    public selectTarget(tableEngine: TableEngine): PileSprite | undefined {
        const pile = tableEngine.sprites.get(this.grabbedEntityId);
        if (pile && PileSprite.isPileSprite(pile)) {
            return pile;
        }
    }

    public animate(sprite: PileSprite) {
        if (sprite.topCardSprite && this.prevCards.length > 0 && !this.origTopCardSprite) {
            this.origTopCardSprite = new CardSprite(sprite.id, this.prevCards[0]!);
            this.origTopCardPosition = sprite.topCardSprite.position;
        }
        // At this point, the topCardSprite should be the new (shuffled)
        // top card.
        if (sprite.topCardSprite && this.origTopCardSprite && this.origTopCardPosition) {
            const slideAmount = sprite.topCardSprite.width / 2;
            let animAmount;
            if (this.completion < 0.5) {
                animAmount = 2 * this.completion;
                sprite.addChild(this.origTopCardSprite);
            } else {
                animAmount = 2 - 2 * this.completion;
                sprite.addChildAt(this.origTopCardSprite, sprite.children.length - 1);
            }
            this.origTopCardSprite.position = this.origTopCardPosition;
            this.origTopCardSprite.x += -animAmount * slideAmount;
            sprite.topCardSprite.x += animAmount * slideAmount;
            for (let i = 0; i < sprite.pileSprites.length; i++) {
                const pileSprite = sprite.pileSprites[i]!;
                const offset = animAmount * slideAmount * (i % 2 == 0 ? -1 : 1);
                pileSprite.x += offset;
            }
        }

        this.completion += 0.1;
    }
}