import { useState, useCallback } from "react";

export interface NoteInventory {
  5: number;
  10: number;
  20: number;
}

export interface Transaction {
  id: number;
  amount: number;
  timestamp: Date;
  balanceAfter: number;
}

const INITIAL_NOTES: NoteInventory = { 5: 4, 10: 15, 20: 7 };
const OVERDRAFT_LIMIT = -100;

export function getTotalCash(notes: NoteInventory): number {
  return notes[5] * 5 + notes[10] * 10 + notes[20] * 20;
}

/** Greedy dispense: largest notes first */
export function dispenseNotes(
  amount: number,
  notes: NoteInventory
): NoteInventory | null {
  let remaining = amount;
  const used: NoteInventory = { 5: 0, 10: 0, 20: 0 };

  for (const denom of [20, 10, 5] as const) {
    const count = Math.min(Math.floor(remaining / denom), notes[denom]);
    used[denom] = count;
    remaining -= count * denom;
  }

  if (remaining !== 0) return null;
  return used;
}

export function useAtm() {
  const [balance, setBalance] = useState<number | null>(null);
  const [notes, setNotes] = useState<NoteInventory>({ ...INITIAL_NOTES });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    (amount: number): { success: boolean; error?: string } => {
      if (balance === null) return { success: false, error: "Not authenticated" };

      if (balance - amount < OVERDRAFT_LIMIT) {
        return { success: false, error: `Withdrawal would exceed overdraft limit of £${Math.abs(OVERDRAFT_LIMIT)}` };
      }

      if (amount > getTotalCash(notes)) {
        return { success: false, error: "ATM has insufficient notes" };
      }

      const dispensed = dispenseNotes(amount, notes);
      if (!dispensed) {
        return { success: false, error: "Cannot dispense exact amount with available notes" };
      }

      const newBalance = balance - amount;
      const newNotes = {
        5: notes[5] - dispensed[5],
        10: notes[10] - dispensed[10],
        20: notes[20] - dispensed[20],
      };

      setBalance(newBalance);
      setNotes(newNotes);
      setTransactions((prev) => [
        {
          id: Date.now(),
          amount,
          timestamp: new Date(),
          balanceAfter: newBalance,
        },
        ...prev,
      ]);
      setError(null);

      return { success: true };
    },
    [balance, notes]
  );

  const login = useCallback((bal: number) => {
    setBalance(bal);
    setNotes({ ...INITIAL_NOTES });
    setTransactions([]);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setBalance(null);
    setNotes({ ...INITIAL_NOTES });
    setTransactions([]);
    setError(null);
  }, []);

  return { balance, notes, transactions, error, setError, withdraw, login, reset };
}
