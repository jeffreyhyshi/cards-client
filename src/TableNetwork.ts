import { type DataConnection, Peer } from "peerjs";
import type { GrabOpts, TableCommitState, TableCommitStateOpts, TableFunction, TableState, TableStateEntity, TableStateOpts } from "./TableState";
import { randomId } from "./util/Utilities";
import type { TableShell } from "./TableShell";

const CARDS_HOSTNAME = "cards-api.jeffreyshi.com";
const CARDS_PATH = "/card-peer";

type TableMethodName = NonNullable<{
    [K in keyof TableState]: TableState[K] extends (opt: any) => void ? K : never;
}[keyof TableState]>;

type TableCommitMethodName = NonNullable<{
    [K in keyof TableCommitState]: TableCommitState[K] extends (opt: any) => void ? K : never;
}[keyof TableCommitState]>;

type TableCall = {
    methodName: TableMethodName,
    opts: TableStateOpts
};

type ValidatedTableCall = NonNullable<{
        [K in keyof TableState]: TableState[K] extends (opt: any) => void ? {
            methodName: K,
            opts: Parameters<TableState[K]>[0],
        } : never
}[keyof TableState]>;

type TableCommitCall = {
    methodName: TableCommitMethodName,
    opts: TableCommitStateOpts,
    seed: number,
    callId: string,
    playerId: string
}

type ValidatedTableCommitCall = NonNullable<{
    [K in keyof TableCommitState]: TableCommitState[K] extends (opt: any) => void ? {
        methodName: K,
        opts: Parameters<TableCommitState[K]>[0]
    } : never
}[keyof TableCommitState]>;

interface TableConfirmation {
    callId: string;
}

interface SerializedTableState {
    entities: Record<string, TableStateEntity>
    grabbed: Record<string, TableCommitStateOpts>
}

interface TableConnectionData {
    tableId: string;
    tableState: SerializedTableState;
    playerIds: string[];
}

interface TablePending {
    isMyCall: boolean;
    count: number;
    tableCall: TableCommitCall;
}

function isTableConnection(data: unknown): data is TableConnectionData {
    return typeof data === "object" &&
        data !== null &&
        "tableId" in data &&
        "playerIds" in data &&
        typeof (data as TableConnectionData).tableId === "string" &&
        Array.isArray((data as TableConnectionData).playerIds);
}

function isTableConfirmation(data: unknown): data is TableConfirmation {
    return typeof data === "object" &&
        data !== null &&
        "callId" in data &&
        typeof (data as TableConfirmation).callId === "string";
}

function isTableCommitCall(data: unknown): data is TableCommitCall {
    return typeof data === "object" &&
        data !== null &&
        "methodName" in data &&
        "opts" in data &&
        "seed" in data &&
        "callId" in data &&
        "playerId" in data &&
        typeof (data as TableCommitCall).methodName === "string" &&
        typeof (data as TableCommitCall).callId === "string" &&
        typeof (data as TableCommitCall).playerId === "string" &&
        typeof (data as TableCommitCall).seed === "number";
}

function isTableCall(data: unknown): data is TableCall {
    return typeof data === "object" &&
        data !== null &&
        "methodName" in data &&
        "opts" in data &&
        typeof (data as TableCall).methodName === "string"
}

// Manages network connections to peers, brokering agreement on conflicting network updates.
export class TableNetwork {
    static PEER_ID_REGEX = /[A-Za-z0-9]{6}/;

    public players: Map<string, DataConnection> = new Map();
    public myself: Peer;
    public tableId?: string;
    public tableShell?: TableShell;
    // Map from callId to the TablePending call, to be committed to TableState upon confirmations.
    private pending: Map<string, TablePending> = new Map();
    // Map from the TableCommitStateOpts.fromId to the TablePending call, to resolve conflicts.
    private conflicts: Map<string, TablePending> = new Map();
    private tableState: TableState;

    static async createTable(tableState: TableState): Promise<TableNetwork> {
        const tablePromise: Promise<TableNetwork> = new Promise((resolve, reject) => {
            const t = new TableNetwork(tableState, (id: string) => {
                resolve(t);
            })
        })
        return tablePromise;
    }

    private constructor(tableState: TableState, readyCallback: (id: string) => void) {
        this.tableState = tableState;
        this.myself = new Peer({
            host: CARDS_HOSTNAME,
            path: CARDS_PATH,
            secure: true,
            // debug: 3
        })
        this.myself.on("open", (id) => {
            this.tableId = id;
            readyCallback(id);
        });
        // Check for others connecting to us. We are the "host"; send the current list of players at the table.
        this.myself.on("connection", (conn) => {
            console.log("connection but not open")
            conn.on("open", () => {
                console.log("opened connection")

                const connData: TableConnectionData = {
                    tableId: this.tableId!,
                    tableState: this.serializeTableState(),
                    playerIds: [this.myself.id, ...Array.from(this.players.keys())]
                };
                conn.send(connData);
                conn.on("data", this.handleData.bind(this));
                this.players.set(conn.peer, conn);
            })
        })
        this.myself.on("error", (err) => {
            console.log("error with peer")
            console.log(err.message)
        })
    }

    public tableCall(validCall: ValidatedTableCall) {
        const call: TableCall = {
            methodName: validCall.methodName,
            opts: validCall.opts,
        }
        for (let player of this.players.values()) {
            player.send(call);
        }
        const m: TableFunction = this.tableState[validCall.methodName]
            .bind(this.tableState) as TableFunction;
        m(validCall.opts)
    }

    public committedTableCall(validCommitCall: ValidatedTableCommitCall) {
        const callId = randomId();
        if (this.players.size > 0) {
            const call: TableCommitCall = {
                methodName: validCommitCall.methodName,
                opts: validCommitCall.opts,
                seed: Math.random(),
                callId: callId,
                playerId: this.myself.id
            }
            for (let player of this.players.values()) {
                player.send(call);
            }
            const p: TablePending = {
                isMyCall: true,
                count: 0,
                tableCall: call
            }
            this.pending.set(callId, p);
        } else {
            const m: TableFunction = this.tableState.commit[validCommitCall.methodName]
                .bind(this.tableState) as TableFunction;
            m(validCommitCall.opts);
        }   
    }

    // Send a request to the "host" peer, wait for the response telling us how to update our table.
    public connectToPeerTable(peerId: string): void {
        console.log("attemting connectToPeerTable")
        if (!this.myself.disconnected && peerId && !this.players.has(peerId) && TableNetwork.PEER_ID_REGEX.test(peerId)) {
            const conn = this.myself.connect(peerId);
            conn.on("open", () => {
                console.log("conn open")

                conn.on("data", this.handleData.bind(this));
                this.players.set(conn.peer, conn);
            });
            conn.on("error", (err) => {
                console.log("conn error")
                console.log(err.message)
            })
        }
    }
     /**
     * Callback handlers - handles received data.
     */
    private handleData(data: any) {
        // P1 FIXME: The ordering of these currently matters which is not great
        if (isTableConnection(data)) {
            this.updateTableConnection(data);
        } else if (isTableCommitCall(data)) {
            this.handleTableCommitCall(data);
        } else if (isTableCall(data)) {
            this.handleTableCall(data);
        } else if (isTableConfirmation(data)) {
            this.handleTableConfirmation(data);
        } else {
            console.log("unknown data");
        }
    }

    // Handle initial receipt of a TableCommitCall
    private handleTableCommitCall(data: TableCommitCall) {
        if (this.conflicts.has(data.opts.fromId)) {
            console.log("has conflict")
            const conflict: TablePending = this.conflicts.get(data.opts.fromId)!;
            if (conflict.tableCall.playerId !== data.playerId) {
                console.log("has different pid")

                if (conflict.tableCall.seed <= data.seed) {
                    console.log("has losing seed")

                    this.cedeCall(data, conflict);
                } // Do nothing if this is a conflict between different players,
                    // and the existing call has a higher seed.
            } else {
                console.log("has same pid")
                this.cedeCall(data);
            }
        } else {
            this.cedeCall(data);
        }
    }

    private cedeCall(data: TableCommitCall, mine?: TablePending) {
        const newPending: TablePending = {
            count: 0,
            isMyCall: false,
            tableCall: data
        };
        this.conflicts.set(data.opts.fromId, newPending);
        if (mine) {
            this.pending.delete(mine.tableCall.callId);
        }
        this.pending.set(data.callId, newPending);
        const winningConn = this.players.get(data.playerId);
        const conf: TableConfirmation = {
            callId: data.callId
        }
        winningConn?.send(conf);
    }

    // Handle receipt of a confirmation of a TableCommitCall
    private handleTableConfirmation(data: TableConfirmation) {
        if (this.pending.has(data.callId)) {
            const p: TablePending = this.pending.get(data.callId)!;
            if (p.isMyCall) {
                p.count += 1;
                if (p.count === this.players.size) {
                    const m: TableFunction = this.tableState.commit[p.tableCall.methodName]
                        .bind(this.tableState) as TableFunction;
                    m(p.tableCall.opts);
                    const conf: TableConfirmation = {
                        callId: p.tableCall.callId
                    }
                    for (let player of this.players.values()) {
                        player.send(conf);
                    }
                    this.pending.delete(data.callId);
                    this.conflicts.delete(p.tableCall.opts.fromId);
                }
            } else {
                const m: TableFunction = this.tableState.commit[p.tableCall.methodName]
                    .bind(this.tableState) as TableFunction;
                m(p.tableCall.opts);
                this.pending.delete(data.callId);
                this.conflicts.delete(p.tableCall.opts.fromId);
            }
        }
    }

    private handleTableCall(data: TableCall) {
        const m: TableFunction = this.tableState[data.methodName]
            .bind(this.tableState) as TableFunction;
        m(data.opts);
    }

    private updateTableConnection(data: TableConnectionData) {
        if (TableNetwork.PEER_ID_REGEX.test(data.tableId)) {
            if (this.tableId !== data.tableId) {
                this.tableId = data.tableId;
                this.players.clear();

                this.tableState.entities = new Map(Object.entries(data.tableState.entities));
                this.tableState.grabbing = new Map(Object.entries(data.tableState.grabbed));
            }
            for (const peerId of data.playerIds) {
                if (!this.players.has(peerId) && this.myself.id !== peerId) {
                    // FIXME: dedup the connections you're getting... shouldn't need to re-open a connection here
                    const conn = this.myself.connect(peerId);
                    conn.on("open", () => {
                        conn.on("data", this.handleData.bind(this));
                    });
                    this.players.set(peerId, conn);
                }
            }
            this.tableCall({
                methodName: "addHand",
                opts: { playerId: this.myself.id }
            });
            this.tableShell?.initFromState();
        }
    }

    private serializeTableState(): SerializedTableState {
        return {
            entities: Object.fromEntries(this.tableState.entities),
            grabbed: Object.fromEntries(this.tableState.grabbing)
        }
    }
}