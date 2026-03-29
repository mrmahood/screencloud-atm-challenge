import { useState, useCallback } from "react";
import {
  EMPTY_NOTE_INVENTORY,
  INITIAL_NOTE_INVENTORY,
  NoteInventory,
  WithdrawalResult,
  processWithdrawal,
} from "@/lib/atm";

export interface Transaction {
  id: number;
  amount: number;
  timestamp: Date;
  balanceAfter: number;
}

const OVERDRAFT_LIMIT = -100;

function createHookFailureResult(message: string, notes: NoteInventory): WithdrawalResult {
  return {
    success: false,
    notesDispensed: { ...EMPTY_NOTE_INVENTORY },
    updatedInventory: { ...notes },
    message,
  };
}

export function useAtm() {
  const [balance, setBalance] = useState<number | null>(null);
  const [notes, setNotes] = useState<NoteInventory>({ ...INITIAL_NOTE_INVENTORY });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    (amount: number): WithdrawalResult => {
      if (balance === null) {
        return createHookFailureResult("Not authenticated.", notes);
      }

      if (balance - amount < OVERDRAFT_LIMIT) {
        return createHookFailureResult(
          `Withdrawal would exceed overdraft limit of £${Math.abs(OVERDRAFT_LIMIT)}.`,
          notes,
        );
      }

      const result = processWithdrawal(amount, notes);
      if (!result.success) {
        return result;
      }

      const newBalance = balance - amount;

      setBalance(newBalance);
      setNotes(result.updatedInventory);
      setTransactions((previousTransactions) => [
        {
          id: Date.now(),
          amount,
          timestamp: new Date(),
          balanceAfter: newBalance,
        },
        ...previousTransactions,
      ]);
      setError(null);

      return result;
    },
    [balance, notes],
  );

  const login = useCallback((startingBalance: number) => {
    setBalance(startingBalance);
    setNotes({ ...INITIAL_NOTE_INVENTORY });
    setTransactions([]);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setBalance(null);
    setNotes({ ...INITIAL_NOTE_INVENTORY });
    setTransactions([]);
    setError(null);
  }, []);

  return { balance, notes, transactions, error, setError, withdraw, login, reset };
}
