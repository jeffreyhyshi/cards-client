import type { Container } from "pixi.js";
import type { GrabOpts } from "../TableState";
import type { TableEngine } from "../TableEngine";

export interface TableAnimation<U extends Container> {
    completion: number;
    selectTarget: (tableEngine: TableEngine) => U | undefined;
    animate: (sprite: U) => void;
}