import type { DomainObject } from "../storage/repo";

export type TxnKind = "income" | "expense" | "sale";

/** A financial account (cash, bank, card) whose balance is derived from txns. */
export interface Account extends DomainObject {
  id: string;
  name: string;
  openingBalance: number; // in minor units (cents)
  createdAt: number;
}

export interface Transaction extends DomainObject {
  id: string;
  accountId: string;
  kind: TxnKind;
  amount: number; // minor units, always positive; sign derived from kind
  quantity?: number; // for sales: units moved
  category: string;
  note?: string;
  timestamp: number; // epoch ms of the transaction
  createdAt: number;
}

export interface Budget extends DomainObject {
  id: string;
  category: string;
  limit: number; // minor units per period
  period: "month";
  createdAt: number;
}

export const FINANCE_COLLECTIONS = {
  account: "fin.account",
  txn: "fin.txn",
  budget: "fin.budget",
} as const;

/** signed value of a transaction for balance math */
export function signedAmount(t: Transaction): number {
  return t.kind === "expense" ? -t.amount : t.amount;
}
