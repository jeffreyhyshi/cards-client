
// Finite state machine representing the world state.

import type { Card } from "./models/Card";
import { Hand } from "./models/Hand";
import { LooseCards } from "./models/LooseCards";
import { Pile } from "./models/Pile";
import { mulberry32 } from "./util/Utilities";

export type TableEntityType = "pile" | "hand" | "loose";

export interface TableStateEntity {
    type: TableEntityType;
    cards: Card[];
}

export interface TableStateOpts {
    playerId: string;
}

export interface SelectOpts extends TableStateOpts {
    indices: number[];
}

export interface TableCommitStateOpts extends TableStateOpts {
    fromId: string
    indices?: number[];
}

export interface GrabOpts extends TableCommitStateOpts {
    newId: string;
    initialWorldX: number;
    initialWorldY: number;
    selecting?: boolean;
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
    insertAt?: number;
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

export interface ShuffleCardsOpts extends TableStateOpts {
    seed: number;
}

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
    public grabbing: Map<string, TableCommitStateOpts> = new Map();

    // Actions which need to be conflict-resolved by TableNetwork before writing to state.
    public commit: TableCommitState = {
        // Grabs entities for a given player. Until release is called, this is assumed to be
        // the source of any cards we're moving. If grab is called for a player who's already grabbing something,
        // release the existing grab before re-grabbing.
        // If the `selecting` flag is on, we do not create a LooseCards entity.
        grab: (opts: GrabOpts) => {
            if (this.grabbing.has(opts.playerId)) {
                this.release(opts);
            }
            for (let grabs of this.grabbing.values()) {
                if (grabs.fromId === opts.fromId) {
                    return;
                }
            }
            const from = this.entities.get(opts.fromId);
            if (from) {
                if (opts.indices) {
                    if (opts.selecting) {
                        // Grab entire existing deck without spawning LooseCards,
                        // specifying selected indices
                        this.grabbing.set(opts.playerId, {
                            playerId: opts.playerId,
                            fromId: opts.fromId,
                            indices: opts.indices
                        });
                        if (this.onGrab) {
                            this.onGrab(opts, this.entities.get(opts.fromId)!);
                        }
                    } else {
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
                        this.grabbing.set(opts.playerId, {
                            playerId: opts.playerId,
                            fromId: opts.newId
                        });
                        this.entities.set(opts.newId, loose);
                        if (this.onGrab && this.entities.has(opts.newId)) {
                            this.onGrab(opts, this.entities.get(opts.newId)!);
                        }
                    }  
                } else {
                    // Grab all cards without spawning LooseCards
                    if (opts.selecting) {
                        this.grabbing.set(opts.playerId, {
                            playerId: opts.playerId,
                            fromId: opts.fromId
                        });
                    } else {
                    // Grab all cards by spawning LooseCards 
                        const loose = new LooseCards(opts, from.cards, opts.initialWorldX, opts.initialWorldY);
                        this.entities.delete(opts.fromId);
                        this.entities.set(opts.newId, loose);
                        this.grabbing.set(opts.playerId, {
                            playerId: opts.playerId,
                            fromId: opts.newId
                        })
                    }
                    
                    if (this.onGrab) {
                        this.onGrab(opts, this.entities.get(opts.fromId)!);
                    }
                }
            }
            
        }
    }

    public select(opts: SelectOpts) {
        const grab = this.grabbing.get(opts.playerId);
        if (grab && this.entities.has(grab.fromId)) {
            this.grabbing.set(opts.playerId, {
                playerId: grab.playerId,
                fromId: grab.fromId,
                indices: opts.indices
            })
            if (this.onSelect) {
                this.onSelect(opts, this.entities.get(grab.fromId)!)
            }
        }
    }

    // Allows a player already holding some hand/deck to "contract" their grabbed cards down by selecting
    // a specific subset.
    public contractGrab(opts: ContractGrabOpts) {
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const from = this.entities.get(grab.fromId);
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
                    this.entities.delete(grab.fromId);
                }
                const loose = new LooseCards({
                    ...opts,
                    fromId: grab.fromId
                }, cards, opts.initialWorldX, opts.initialWorldY);
                this.grabbing.set(opts.playerId, {
                    playerId: opts.playerId,
                    fromId: opts.newId
                });
                this.entities.set(opts.newId, loose);
            }
        }
    }

    // Moves cards from one hand/deck to another.
    public moveCards(opts: MoveCardsOpts) {
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const from = this.entities.get(grab.fromId);
            const to = this.entities.get(opts.toId);
            if (from && to && from !== to) {
                if (opts.insertAt) {
                    to.cards.splice(opts.insertAt, 0, ...from.cards);
                } else {
                    to.cards.unshift(...from.cards);
                }
                if (from.type !== "hand") {
                    this.entities.delete(grab.fromId);
                } else {
                    from.cards = [];
                }
            }
            this.grabbing.delete(opts.playerId);
            if (this.onMoveCards) {
                this.onMoveCards(opts);
            }
        }
    }

    public moveCardsToNewPile(opts: MoveCardsToNewPileOpts) {
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const from = this.entities.get(grab.fromId);
            if (from) {
                const newPile = new Pile(opts.gridX, opts.gridY, from.cards);
                this.entities.set(opts.newId, newPile);
                if (from.type !== "hand") {
                    this.entities.delete(grab.fromId);
                } else {
                    from.cards = [];
                }
            }
            this.grabbing.delete(opts.playerId);
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
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const grabbedEntity = this.entities.get(grab.fromId);
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

    public shuffleCards(opts: ShuffleCardsOpts) {
        const rand = mulberry32(opts.seed);
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const from = this.entities.get(grab.fromId);
            if (from) {
                const old = [...from.cards];
                for (let i = from.cards.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1));
                    [from.cards[j], from.cards[i]] = [from.cards[i]!, from.cards[j]!];
                }
                if (this.onShuffleCards) {
                    this.onShuffleCards(opts, grab.fromId, from, old);
                }
            }
        }
    }

    public flipCards(opts: FlipCardOpts) {
        const grab = this.grabbing.get(opts.playerId);
        if (grab) {
            const from = this.entities.get(grab.fromId);
            if (from) {
                if (grab.indices) {
                    for (let index of grab.indices) {
                        const card = from.cards[index];
                        if (card) {
                            card.faceUp = !card.faceUp;
                        }
                    }
                } else {
                    for (let card of from.cards) {
                        card.faceUp = !card.faceUp;
                    }
                }        
                // If the cards are being flipped "together", reverse the order of the cards
                if (opts.together) {
                    if (grab.indices) {
                        // I'll implement this when actually needed
                    } else {
                        from.cards.reverse();
                    }
                }
                if (this.onFlipCards) {
                    this.onFlipCards(opts, grab.fromId, from, grab.indices);
                }
            }
        }
    }

    // Called when a grabbed card is released without ending up somewhere else
    public release(opts: ReleaseOpts) {
        const release = this.grabbing.get(opts.playerId);
        if (release) {
            const released = this.entities.get(release.fromId);
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
                    this.entities.delete(release.fromId);
                } else if (returnTo) {
                    returnTo.cards = released.cards;
                    // Only delete if we've replaced cards to their returnTo
                    this.entities.delete(release.fromId);
                }
            }
            this.grabbing.delete(opts.playerId);
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

    public onShuffleCards?: (opts: ShuffleCardsOpts, grabbedEntityId: string, grabbedEntity: TableStateEntity, prevDeck: Card[]) => void;

    public onGrabbedCardPosition?: (opts: GrabbedCardPositionOpts) => void;

    public onFlipCards?: (opts: FlipCardOpts, grabbedEntityId: string, grabbedEntity: TableStateEntity, indices?: number[]) => void;

    public onRelease?: (opts: ReleaseOpts) => void;

    public onSelect?: (opts: SelectOpts, entity: TableStateEntity) => void;
}