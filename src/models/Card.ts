export const Suits = {
    Spades: 0,
    Hearts: 1,
    Clubs: 2,
    Diamonds: 3
} as const;

export type Suit = typeof Suits[keyof typeof Suits];

export const MIN_RANK = 1;

export const MAX_RANK = 13;

export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type JokerRank = 0 | 1 | 2;

export class Card {
    public joker: JokerRank;
    public suit: Suit;
    public rank: Rank;

    static smallJoker(): Card {
        let result: Card = new Card(Suits.Spades, 1);
        result.joker = 1;
        return result;
    }

    static bigJoker(): Card {
        let result: Card = new Card(Suits.Spades, 1);
        result.joker = 2;
        return result;
    }

    constructor(suit: Suit, rank: Rank) {
        this.joker = 0;
        this.suit = suit;
        this.rank = rank;
    }
}