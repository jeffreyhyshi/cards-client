import type { Table } from "../Table";

export interface TableEntity {
    entityId: string;
    enregister?: (table: Table) => void;
}