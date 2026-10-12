import { CardSprite } from "../sprites/CardSprite";
import { PileSprite } from "../sprites/PileSprite";
import type { TableEngine } from "../TableEngine";
import type { GrabOpts } from "../TableState";
import type { TableAnimation } from "./TableAnimation";

export class PileCardFlipAnimation implements TableAnimation<PileSprite> {
    public completion = 0;
    // Defaults to using grabbedEntityId, if it still exists.
    // Falls back to grabbedFrom if this is something that was grabbed that was
    // subsequently released.
    public grabbedEntityId: string;
    public grabbedFrom?: GrabOpts;
    // We need to hold a reference to this because we need to re-draw the piles for partial flips
    public tableEngine: TableEngine;

    constructor(tableEngine: TableEngine, grabbedEntityId: string, grabbedFrom?: GrabOpts) {
        this.grabbedEntityId = grabbedEntityId;
        this.grabbedFrom = grabbedFrom;
        this.tableEngine = tableEngine;
    }

    public selectTarget(tableEngine: TableEngine): PileSprite | undefined {
        const grabbedEntity = tableEngine.spriteEntities.get(this.grabbedEntityId);
        if (grabbedEntity && PileSprite.isPileSprite(grabbedEntity)) {
            return grabbedEntity;
        } else if (!grabbedEntity && this.grabbedFrom) {
            const origPile = tableEngine.spriteEntities.get(this.grabbedFrom.fromId);
            if (origPile && PileSprite.isPileSprite(origPile)) {
                return origPile;
            }
        }
        return;
    }

    public animate(sprite: PileSprite) {
        if (this.grabbedEntityId == sprite.id) {
            this.animateFullPileFlip(sprite);
        } else {
            this.animatePartialPileFlip(sprite);
        }
        this.completion += 0.1;
    }

    private animateFullPileFlip(sprite: PileSprite) {
        if (sprite.topCardSprite) {
            // Adjust pivot to center
            sprite.pivot.set(sprite.topCardSprite.width / 2, 0);
            sprite.x += sprite.topCardSprite.width / 2;

            let toFaceUp = sprite.topCardSprite.front;
            let toFaceDown = sprite.topCardSprite.back;
            if (!sprite.topCardSprite.card.faceUp) {
                // We need to replace the top card our former top card
                // b/c it's at the bottom now
                const bottomCard = sprite.entity.cards[sprite.entity.cards.length - 1];
                if (bottomCard) {
                    const topCardSpriteX = sprite.topCardSprite.x;
                    const topCardSpriteY = sprite.topCardSprite.y;
                    sprite.removeChild(sprite.topCardSprite);
                    sprite.topCardSprite = new CardSprite(sprite.id, bottomCard);
                    sprite.addChild(sprite.topCardSprite);
                    sprite.topCardSprite.x = topCardSpriteX;
                    sprite.topCardSprite.y = topCardSpriteY;
                }
                toFaceUp = sprite.topCardSprite.back;
                toFaceDown = sprite.topCardSprite.front;
            }
            
            if (toFaceUp && toFaceDown) {
                if (this.completion <= 0.5) {
                    toFaceUp.visible = false;
                    toFaceDown.visible = true;
                } else {
                    toFaceUp.visible = true;
                    toFaceDown.visible = false;
                }
                sprite.scale.x = 2 * Math.abs(this.completion - 0.5);
            }
        }
    }

    private animatePartialPileFlip(sprite: PileSprite) {
        let spriteToAnimate = sprite;
        if (this.grabbedFrom?.indices && this.grabbedFrom.indices.length > 0) {
            const lastIndex = this.grabbedFrom.indices[this.grabbedFrom.indices.length - 1]!;
            spriteToAnimate = sprite.splitPileSpriteByRange(lastIndex, this.tableEngine) ?? sprite;
        }
        this.animateFullPileFlip(spriteToAnimate);
    }
}