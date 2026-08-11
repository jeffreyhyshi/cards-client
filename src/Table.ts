import { type DataConnection, Peer } from 'peerjs';
import { Pile } from './models/Pile';
import { Hand } from './models/Hand';
import type { TableEntity } from './models/TableEntity';
import type { CardSprite } from './sprites/CardSprite';

// Various DTOs that represent the expected data format over the DataConnection
type Serializable =
    | string
    | number
    | boolean
    | null
    | Serializable[]
    | { [key: string]: Serializable };

interface CardMovement {
    x: number;
    y: number;
    entityId: string;
}

interface TableMethodCall {
    entityId: string;
    action: (opts: Serializable) => void;
    options: Serializable;
    callback: (success: boolean) => void;
}

interface TableCommand {
    commandId: string;
    methodCalls: TableMethodCall[];
}

interface TableRemoteMethodCall {
    entityId: string;
    methodCall: string;
    options: Serializable;
}

interface TableRemoteCommand {
    commandId: string;
    methodCalls: TableRemoteMethodCall[];
}

interface ConfirmationData {
    commandId: string;
}

interface TableConnectionData {
    tableId: string;
    playerIds: string[];
}

function isTableConnection(data: unknown): data is TableConnectionData {
    return typeof data === "object" &&
        data !== null &&
        "tableId" in data &&
        "playerIds" in data &&
        typeof (data as TableConnectionData).tableId === "string" &&
        Array.isArray((data as TableConnectionData).playerIds);
}

function isCardMovement(data: unknown): data is CardMovement {
    return typeof data === "object" &&
        data !== null &&
        "x" in data &&
        "y" in data &&
        "entityId" in data &&
        typeof (data as CardMovement).x === "number" &&
        typeof (data as CardMovement).y === "number" &&
        typeof (data as CardMovement).entityId === "string";
}

// Manages peer connections. Requests to update model state go through this layer.
export class Table {
    static PEER_ID_REGEX = /[A-Za-z0-9]{6}/;
    // List of PeerIds
    public players: Map<string, DataConnection> = new Map();
    private myself: Peer;
    public tableId: string | undefined;
    private entities: Map<string, TableEntity> = new Map();
    private pendingActions: Map<string, TableCommand> = new Map(); 

    static async createTable(): Promise<Table> {
        const tablePromise: Promise<Table> = new Promise((resolve, reject) => {
            const t = new Table((id: string) => {
                resolve(t);
            })
        })
        return tablePromise;
    }

    private constructor(readyCallback: (id: string) => void) {
        this.myself = new Peer({
            host: "cards-api.jeffreyshi.com",
            path: "/card-peer",
            secure: true
        })
        this.myself.on("open", (id) => {
            this.tableId = id;
            readyCallback(id);
        });
        // Check for others connecting to us. We are the "host"; send the current list of players at the table.
        this.myself.on("connection", (conn) => {
            conn.on("open", () => {
                conn.send({
                    tableId: this.tableId,
                    playerIds: [this.myself.id, ...Array.from(this.players.keys())]
                } as TableConnectionData);
                conn.on("data", this.handleData.bind(this));
                this.players.set(conn.peer, conn);
            })
        })
    }

    public addEntity(entity: TableEntity) {
        this.entities.set(entity.entityId, entity);
        if ("enregister" in entity) {
            entity.enregister(this);
        }
    }

    public broadcast(x: number, y: number, entityId: string) {
        for (let playerConn of this.players.values()) {
            if (playerConn.open) {
                playerConn.send({
                    x: x,
                    y: y,
                    entityId: entityId
                })
            }
        }
    }
    
    public wrap(entity: TableEntity,
                action: (opts: any) => void,
                options: any,
                callback: (success: boolean) => void): TableMethodCall {
        return { entityId: entity.entityId, action: action, options: options, callback: callback };
    }

    // Attempts a series of actions on the modeled game state.
    // First, sends its intentions to its peers.
    // Then, waits for confirmations from all peers.
    // Finally, executes the action locally.
    public attemptActions(tableMethodCalls: TableMethodCall | TableMethodCall[]) {
        if (!Array.isArray(tableMethodCalls)) {
            tableMethodCalls = [tableMethodCalls];
        }
        let remoteCalls: TableRemoteMethodCall[] = [];
        for (let tableMethodCall of tableMethodCalls) {
            let remoteCall: TableRemoteMethodCall = {
                entityId: tableMethodCall.entityId,
                methodCall: tableMethodCall.action.name,
                options: tableMethodCall.options
            }
            remoteCalls.push(remoteCall);
        }
        const id = Math.random().toString(36).substring(2, 10);
        const remoteCommand: TableRemoteCommand = {
            commandId: id,
            methodCalls: remoteCalls
        }
        for (let player of this.players.values()) {
            player.send(remoteCommand);
        }
    }

    // Send a request to the "host" peer, wait for the response telling us how to update our table.
    public connectToPeerTable(peerId: string): void {
        if (!this.myself.disconnected && peerId && !this.players.has(peerId) && Table.PEER_ID_REGEX.test(peerId)) {
            const conn = this.myself.connect(peerId);
            conn.on("open", () => {
                conn.on("data", this.handleData.bind(this));
                this.players.set(conn.peer, conn);
            });
        }
    }

    private handleData(data: any) {
        if (isTableConnection(data)) {
            this.updateTableConnection(data);
        } else if (isCardMovement(data)) {
            this.updateCardMovement(data);
        } else {
            console.log("unknown data")
        }
    }

    private updateCardMovement(data: CardMovement) {
        let entity = this.entities.get(data.entityId);
        if (entity && "x" in entity && "y" in entity) {
            entity.x = data.x;
            entity.y = data.y;
        }
    }

    private updateTableConnection(data: TableConnectionData) {
        if (Table.PEER_ID_REGEX.test(data.tableId)) {
            if (this.tableId !== data.tableId) {
                this.tableId = data.tableId;
                this.players.clear();
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
        }
    }
} 