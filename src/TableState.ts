
// Finite state machine representing the world state.

import type { Card } from "./models/Card";
import { Hand } from "./models/Hand";
import { LooseCards } from "./models/LooseCards";
import { Pile } from "./models/Pile";

export type TableEntityType = "pile" | "hand" | "loose";

export interface TableStateEntity {
    type: TableEntityType;
    cards: Card[]; 
}

export interface TableStateOpts {
    playerId: string;
}

export interface TableCommitStateOpts extends TableStateOpts {
    fromId: string
    indices?: number[];
}

export interface GrabOpts extends TableCommitStateOpts {
    newId: string;
    initialWorldX: number;
    initialWorldY: number;
}

export interface ContractGrabOpts extends TableStateOpts {
    newId: string;
    indices: number[];
    initialWorldX: number;
    initialWorldY: number;
}

export interface FlipCardOpts extends TableStateOpts {
    // Represents whether we flip the entire pile at once, i.e. also flip the order
    together: boolean;
}

export interface ReleaseOpts extends TableStateOpts {}

export interface AddDeckOpts extends TableStateOpts {
    newId: string;
    gridX: number;
    gridY: number;
}

export interface AddHandOpts extends TableStateOpts {}

export interface MoveCardsOpts extends TableStateOpts {
    toId: string;
}

export interface MoveCardsToNewPileOpts extends TableStateOpts {
    newId: string;
    gridX: number;
    gridY: number;
}

export interface GrabbedCardPositionOpts extends TableStateOpts {
    worldX: number;
    worldY: number;
}

export interface ReorderCardsOpts extends TableStateOpts {}

export type TableFunction = (opt: TableStateOpts) => void;

// Operations that can conflict, and thus require that we go through a round of
// confirmation between peers before we commit it to the table state
export interface TableCommitState {
    grab: (opts: GrabOpts) => void;
}

// Actions on decks/cards/hands are handled through this object.
export class TableState {
    // Map from entityId to their types
    public entities: Map<string, TableStateEntity> = new Map();
    // Map from player ID to the entityId they are currently grabbing
    public grabbed: Map<string, string> = new Map();

    // Actions which need to be conflict-resolved by TableNetwork before writing to state.
    public commit: TableCommitState = {
        // Grabs entities for a given player. Until release is called, this is assumed to be
        // the source of any cards we're moving.
        grab: (opts: GrabOpts) => {
            const from = this.entities.get(opts.fromId);
            if (from) {
                if (opts.indices) {
                    const cards = [];
                    // Iterate through indices in reverse order
                    for (let i = opts.indices.length - 1; i >= 0; i--) {
                        let fromCard = from.cards[opts.indices[i]!];
                        if (fromCard) {
                            cards.unshift(fromCard);
                            from.cards.splice(opts.indices[i]!, 1);
                        }
                    }
                    if (from.type !== "hand" && from.cards.length === 0) {
                        this.entities.delete(opts.fromId);
                    }
                    const loose = new LooseCards(opts, cards, opts.initialWorldX, opts.initialWorldY);
                    this.grabbed.set(opts.playerId, opts.newId);
                    this.entities.set(opts.newId, loose);
                    if (this.onGrab && this.entities.has(opts.newId)) {
                        this.onGrab(opts, this.entities.get(opts.newId)!);
                    }
                } else {
                    // Grab entire existing deck without spawning LooseCards
                    this.grabbed.set(opts.playerId, opts.fromId);
                    if (this.onGrab) {
                        this.onGrab(opts, this.entities.get(opts.fromId)!);
                    }
                }
            }
            
        }
    }

    // Allows a player already holding some hand/deck to "contract" their grabbed cards down by selecting
    // a specific subset.
    public contractGrab(opts: ContractGrabOpts) {
        const fromId = this.grabbed.get(opts.playerId);
        if (fromId) {
            const from = this.entities.get(fromId);
            const cards = [];
            if (from) {
                // Iterate through indices in reverse order
                for (let i = opts.indices.length - 1; i >= 0; i--) {
                    let fromCard = from.cards[opts.indices[i]!];
                    if (fromCard) {
                        cards.unshift(fromCard);
                        from.cards.splice(opts.indices[i]!, 1);
                    }
                }
                if ((from.type !== "hand") && from.cards.length === 0) {
                    this.entities.delete(fromId);
                }
                const loose = new LooseCards({
                    ...opts,
                    fromId: fromId
                }, cards, opts.initialWorldX, opts.initialWorldY);
                this.grabbed.set(opts.playerId, opts.newId);
                this.entities.set(opts.newId, loose);
            }
        }
    }

    // Moves cards from one hand/deck to another.
    public moveCards(opts: MoveCardsOpts) {
        const fromId = this.grabbed.get(opts.playerId);
        if (fromId) {
            const from = this.entities.get(fromId);
            const to = this.entities.get(opts.toId);
            if (from && to && from !== to && (from.type !== "hand")) {
                to.cards.unshift(...from.cards);
                this.entities.delete(fromId);
            }
            this.grabbed.delete(opts.playerId);
            if (this.onMoveCards) {
                this.onMoveCards(opts);
            }
        }
    }

    public moveCardsToNewPile(opts: MoveCardsToNewPileOpts) {
        const fromId = this.grabbed.get(opts.playerId);
        if (fromId) {
            const from = this.entities.get(fromId);
            if (from) {
                const newPile = new Pile(opts.gridX, opts.gridY, from.cards);
                this.entities.set(opts.newId, newPile);
                if (from.type !== "hand") {
                    this.entities.delete(fromId);
                }
            }
            this.grabbed.delete(opts.playerId);
            if (this.onMoveCardsToNewPile) {
                this.onMoveCardsToNewPile(opts);
            }
        }
    }

    public addDeck(opts: AddDeckOpts) {
        const newDeck = Pile.newDeck(opts.gridX, opts.gridY);
        this.entities.set(opts.newId, newDeck);
    }

    public addHand(opts: AddHandOpts) {
        const newHand = new Hand(opts.playerId);
        this.entities.set(opts.playerId, newHand);
        if (this.onAddHand) {
            this.onAddHand(opts);
        }
    }

    public grabbedCardPosition(opts: GrabbedCardPositionOpts) {
        const grabbedEntityId = this.grabbed.get(opts.playerId);
        if (grabbedEntityId) {
            const grabbedEntity = this.entities.get(grabbedEntityId);
            // Only valid for LooseCards
            if (grabbedEntity && LooseCards.isLooseCards(grabbedEntity)) {
                grabbedEntity.worldX = opts.worldX;
                grabbedEntity.worldY = opts.worldY;
                if (this.onGrabbedCardPosition) {
                    this.onGrabbedCardPosition(opts);
                }
            }
        }
    }

    public reorderCards(opts: ReorderCardsOpts) {

    }

    public flipCards(opts: FlipCardOpts) {
        const grabbedEntityId = this.grabbed.get(opts.playerId);
        if (grabbedEntityId) {
            const from = this.entities.get(grabbedEntityId);
            if (from) {
                for (let card of from.cards) {
                    card.faceUp = !card.faceUp;
                }
                // If the cards are being flipped "together", we need to reverse the order of the cards
                if (opts.together) {
                    from.cards.reverse();
                }
                if (this.onFlipCards) {
                    this.onFlipCards(opts, grabbedEntityId, from);
                }
            }
        }
    }

    // Called when a grabbed card is released without ending up somewhere else
    public release(opts: ReleaseOpts) {
        const releasedId = this.grabbed.get(opts.playerId);
        if (releasedId) {
            const released = this.entities.get(releasedId);
            // Return our "borrowed" cards
            if (released && LooseCards.isLooseCards(released)) {
                const returnToId = released.from.fromId;
                const returnTo = this.entities.get(returnToId);
                if (returnTo && released.from.indices) {
                    for (let i = 0; i < released.cards.length; i++) {
                        const returnInd = released.from.indices[i] ?? returnTo.cards.length;
                        returnTo.cards.splice(returnInd, 0, released.cards[i]!);
                    }
                    // Only delete if we've replaced cards to their returnTo
                    this.entities.delete(releasedId);
                } else if (returnTo) {
                    returnTo.cards = released.cards;
                    // Only delete if we've replaced cards to their returnTo
                    this.entities.delete(releasedId);
                }
            }
            this.grabbed.delete(opts.playerId);
            if (this.onRelease) {
                this.onRelease(opts);
            }
        }
    }

    public onGrab?: (opts: GrabOpts, grabbedEntity: TableStateEntity) => void;

    public onMoveCards?: (opts: MoveCardsOpts) => void;

    public onMoveCardsToNewPile?: (opts: MoveCardsToNewPileOpts) => void;

    public onAddDeck?: (opts: AddDeckOpts) => void;

    public onAddHand?: (opts: AddHandOpts) => void;

    public onGrabbedCardPosition?: (opts: GrabbedCardPositionOpts) => void;

    public onFlipCards?: (opts: FlipCardOpts, grabbedEntityId: string, grabbedEntity: TableStateEntity) => void;

    public onRelease?: (opts: ReleaseOpts) => void;
}