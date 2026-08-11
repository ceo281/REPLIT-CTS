import { deleteRecord, getRecord, listRecords, putRecord } from "../storage/repo";
import {
  FINANCE_COLLECTIONS as C,
  type Account,
  type Budget,
  type Transaction,
} from "./types";

const VAULT = "finance" as const;

function uid(): string {
  return crypto.randomUUID();
}

// ---- Accounts --------------------------------------------------------------

export async function listAccounts(dek: CryptoKey): Promise<Account[]> {
  return (await listRecords<Account>(dek, VAULT, C.account)).sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

export async function createAccount(
  dek: CryptoKey,
  input: { name: string; openingBalance?: number },
): Promise<Account> {
  const acct: Account = {
    id: uid(),
    name: input.name.trim(),
    openingBalance: input.openingBalance ?? 0,
    createdAt: Date.now(),
  };
  await putRecord(dek, VAULT, C.account, acct);
  return acct;
}

export async function deleteAccount(dek: CryptoKey, id: string): Promise<void> {
  // Cascade delete this account's transactions.
  const txns = await listTransactions(dek);
  for (const t of txns.filter((t) => t.accountId === id)) {
    await deleteRecord(VAULT, t.id);
  }
  await deleteRecord(VAULT, id);
}

// ---- Transactions ----------------------------------------------------------

export async function listTransactions(dek: CryptoKey): Promise<Transaction[]> {
  return (await listRecords<Transaction>(dek, VAULT, C.txn)).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export async function getTransaction(
  dek: CryptoKey,
  id: string,
): Promise<Transaction | undefined> {
  return getRecord<Transaction>(dek, VAULT, C.txn, id);
}

export async function saveTransaction(
  dek: CryptoKey,
  input: Omit<Transaction, "createdAt"> & { createdAt?: number },
): Promise<Transaction> {
  const txn: Transaction = { ...input, createdAt: input.createdAt ?? Date.now() };
  await putRecord(dek, VAULT, C.txn, txn);
  return txn;
}

export async function newTransaction(
  dek: CryptoKey,
  input: Omit<Transaction, "id" | "createdAt">,
): Promise<Transaction> {
  return saveTransaction(dek, { ...input, id: uid() });
}

export async function deleteTransaction(_dek: CryptoKey, id: string): Promise<void> {
  await deleteRecord(VAULT, id);
}

// ---- Budgets ---------------------------------------------------------------

export async function listBudgets(dek: CryptoKey): Promise<Budget[]> {
  return listRecords<Budget>(dek, VAULT, C.budget);
}

export async function newBudget(
  dek: CryptoKey,
  input: { category: string; limit: number },
): Promise<Budget> {
  const b: Budget = {
    id: uid(),
    category: input.category.trim(),
    limit: input.limit,
    period: "month",
    createdAt: Date.now(),
  };
  await putRecord(dek, VAULT, C.budget, b);
  return b;
}

export async function deleteBudget(_dek: CryptoKey, id: string): Promise<void> {
  await deleteRecord(VAULT, id);
}
