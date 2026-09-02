
// Finite state machine representing the world state.

import type { Card } from "./models/Card";
import { Hand } from "./models/Hand";
import { Pile } from "./models/Pile";
import { arraysEqual } from "./util/Utilities";

export type TableEntityType = "pile" | "hand";

export interface TableStateEntity {
    type: TableEntityType;
    cards: Card[]; 
}

export interface TableStateOpts {
    playerId: string;
}

export interface TableCommitStateOpts extends TableStateOpts {
    fromId: string
    indices? : number[];
}

export interface GrabOpts extends TableCommitStateOpts {}

export interface ReleaseOpts extends TableStateOpts {
    playerId: string;
}

export interface AddDeckOpts extends TableStateOpts {
    newId: string;
    gridX: number;
    gridY: number;
}

export interface AddHandOpts extends TableStateOpts {}

export interface MoveCardsOpts extends TableStateOpts {
    indices: number[];
    fromId: string;
    toId: string;
}

export interface MoveCardsToNewPileOpts extends TableStateOpts {
    indices: number[];
    fromId: string;
    newId: string;
    gridX: number;
    gridY: number;
}

export interface GrabbedCardPositionOpts extends TableStateOpts {
    worldX: number;
    worldY: number;
}

export interface ReorderCardsOpts extends TableStateOpts {
    entityId: string;
}

export type TableFunction = (opt: TableStateOpts) => void;

// Operations that can conflict, and thus require that we go through a round of
// confirmation between peers before we commit it to the table state
export interface TableCommitState {
    grab: (opts: GrabOpts) => void;
}

// Actions on decks/cards/hands are handled through this object.
export class TableState {
    // Actions which need to be conflict-resolved by TableNetwork before writing to state.
    public commit: TableCommitState = {
        grab: (opts: GrabOpts) => {
            this.grabbedEntities.set(opts.playerId, opts);
        }
    }

    // Map from entityId to their types
    public entities: Map<string, TableStateEntity> = new Map();
    // Map from player ID to the entities they are currently grabbing
    public grabbedEntities: Map<string, GrabOpts> = new Map();

    // Moves cards from one hand/deck to another.
    // Card must have already been grabbed by the given player.
    public moveCards(opts: MoveCardsOpts) {
        // console.log("moveCards: ");
        // console.log(opts);
        const grabbed = this.grabbedEntities.get(opts.playerId)
        if (grabbed && grabbed.fromId === opts.fromId &&
            ((grabbed.indices && arraysEqual(grabbed.indices, opts.indices)) || !grabbed.indices)) {
            const from = this.entities.get(opts.fromId);
            const to = this.entities.get(opts.toId);
            if (from && to) {
                // Iterate through indices in reverse order
                for (let i = opts.indices.length - 1; i >= 0; i--) {
                    let fromCard = from.cards[opts.indices[i]!];
                    if (fromCard) {
                        to.cards.unshift(fromCard);
                        from.cards.splice(opts.indices[i]!, 1);
                    }
                }
                if (from.type === "pile" && from.cards.length === 0) {
                    this.entities.delete(opts.fromId);
                }
            }
            this.grabbedEntities.delete(opts.playerId);
            if (this.onMoveCards) {
                this.onMoveCards(opts);
            }
        }
    }

    public moveCardsToNewPile(opts: MoveCardsToNewPileOpts) {
        // console.log("moveCardsToNewPile: ");
        // console.log(opts);
        const grabbed = this.grabbedEntities.get(opts.playerId)
        if (grabbed && grabbed.fromId === opts.fromId &&
            ((grabbed.indices && arraysEqual(grabbed.indices, opts.indices)) || !grabbed.indices)) {
            const from = this.entities.get(opts.fromId);
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
                if (from.type === "pile" && from.cards.length === 0) {
                    this.entities.delete(opts.fromId);
                }
            }
            const newPile = new Pile(opts.gridX, opts.gridY, cards);
            this.entities.set(opts.newId, newPile);
            this.grabbedEntities.delete(opts.playerId);
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
    }

    public grabbedCardPosition(opts: GrabbedCardPositionOpts) {
        if (this.grabbedEntities.has(opts.playerId)) {
            if (this.onGrabbedCardPosition) {
                this.onGrabbedCardPosition(opts);
            }
        }
    }

    public reorderCards(opts: ReorderCardsOpts) {

    }

    // Called when a grabbed card is released without ending up somewhere else
    public release(opts: ReleaseOpts) {
        let released = this.grabbedEntities.get(opts.playerId);
        if (released) {
            this.grabbedEntities.delete(opts.playerId);
            if (this.onRelease) {
                this.onRelease(opts, released);
            }
        }
    }

    public onMoveCards?: (opts: MoveCardsOpts) => void;

    public onMoveCardsToNewPile?: (opts: MoveCardsToNewPileOpts) => void;

    public onAddDeck?: (opts: AddDeckOpts) => void;

    public onGrabbedCardPosition?: (opts: GrabbedCardPositionOpts) => void;

    public onRelease?: (opts: ReleaseOpts, released: GrabOpts) => void;
}