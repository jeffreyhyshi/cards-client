import { FederatedPointerEvent, Sprite, Texture } from 'pixi.js'
import { CardSprite } from './CardSprite';
import type { TableSprite } from './TableSprite';
import type { TableEngine } from '../TableEngine';
import type { TableStateEntity } from '../TableState';
import { randomId } from '../util/Utilities';

// Sprite representing a pile of cards.
// Contains card backgrounds and CardSprites as necessary
export class PileSprite extends Sprite implements TableSprite {
    public type: "pile" = "pile";
    public id: string;
    public entity: TableStateEntity;

    public topCardSprite?: CardSprite;
    public pileSprites: Sprite[] = [];

    static isPileSprite(s: TableSprite): s is PileSprite {
        return s.type === "pile";
    }

    constructor(entityId: string, entity: TableStateEntity) {
        super();
        this.id = entityId;
        this.entity = entity;
    }

    public draw(table: TableEngine) {
        this.removeChildren();

        this.pileSprites = [];
        // For every five cards remaining in the pile, draw a stacked "card" to indicate quantity
        let i = 0;
        for (; i < Math.floor(this.entity.cards.length / 10); i++) {
            let pileSprite = new Sprite(Texture.from('card.png'));
            this.addChild(pileSprite);
            pileSprite.x = -3 * i;
            pileSprite.y = -3 * i;
            this.pileSprites.push(pileSprite);
        }
        if (this.entity.cards.length > 0) {
            this.topCardSprite = new CardSprite(this.id, this.entity.cards[0]!);
            this.addChild(this.topCardSprite);
            this.topCardSprite.x = -3 * i;
            this.topCardSprite.y = -3 * i;
            this.topCardSprite.index = 0;
        }
        if (this.topCardSprite) {
            table.decorateCardBehavior(this.topCardSprite);
        }
    }

    public getCardSprite(index: number): CardSprite | undefined {
        if (index === 0 && this.topCardSprite) {
            return this.topCardSprite;
        } else {
            return;
        }
    }

    // Splits this PileSprite into two PileSprites, with the returned PileSprite representing
    // the cards from 0 - (endIndex - 1), and the current PileSprite representing the cards
    // from endIndex to pile.cards.length. Used for the PileCardFlipAnimation.
    // Takes advantage of the fact that this will be reset after each frame.
    public splitPileSpriteByRange(endIndex: number, tableEngine: TableEngine): PileSprite | undefined {
        if (endIndex > 0 && endIndex < this.entity.cards.length) {
            const bottomHalfPile: TableStateEntity = {
                type: "pile",
                cards: this.entity.cards.slice(endIndex, this.entity.cards.length)
            }
            const topHalfPile: TableStateEntity = {
                type: "pile",
                cards: this.entity.cards.slice(0, endIndex)
            }
            this.entity = bottomHalfPile;
            this.draw(tableEngine);
            const topHalfPileSprite = new PileSprite("temp", topHalfPile);
            this.addChild(topHalfPileSprite);
            if (this.topCardSprite) {
                topHalfPileSprite.x = this.topCardSprite.x + 3;
                topHalfPileSprite.y = this.topCardSprite.y + 3;
            }
            topHalfPileSprite.draw(tableEngine);
        }
        return;
    }

    public onDragRelease(table: TableEngine, _event: FederatedPointerEvent) {
        table.tableNetwork.tableCall({
            methodName: "moveCards",
            opts: {
                playerId: table.tableNetwork.myself.id,
                toId: this.id
            }
        });
    }

    public onTapRelease(table: TableEngine,
                        _event: FederatedPointerEvent,
                        previouslyGrabbed: boolean,
                        _index: number) {
        console.log("in PileSprite's onTapRelease")
        if (previouslyGrabbed) {
            table.tableNetwork.tableCall({
                methodName: "release",
                opts: {
                    playerId: table.tableNetwork.myself.id,
                }
            });
        } else {
            console.log("in PileSprite's onTapRelease re-grabbing successfully")

            const globalPos = table.fromScreenToWorldPosition(this.toGlobal({x: 0, y: 0}));
            table.tableNetwork.committedTableCall({
                methodName: "grab",
                opts: {
                    playerId: table.tableNetwork.myself.id,
                    newId: randomId(),
                    fromId: this.id,
                    initialWorldX: globalPos.worldX,
                    initialWorldY: globalPos.worldY,
                    selecting: true
                }
            });
        }
    }

    public onInitialMove(table: TableEngine, event: FederatedPointerEvent) {
        
    }
}