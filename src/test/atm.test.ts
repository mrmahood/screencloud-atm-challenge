import { describe, expect, it } from "vitest";
import {
  EMPTY_NOTE_INVENTORY,
  INITIAL_NOTE_INVENTORY,
  NoteInventory,
  WithdrawalResult,
  processWithdrawal,
  processWithdrawalSequence,
  selectBestNoteCombination,
} from "@/lib/atm";

const OVERDRAFT_LIMIT = -100;

interface AccountAttemptInput {
  balance: number;
  amount: number;
  inventory: NoteInventory;
}

interface AccountAttemptResult {
  balanceAfter: number;
  result: WithdrawalResult;
}

function attemptAccountWithdrawal({
  balance,
  amount,
  inventory,
}: AccountAttemptInput): AccountAttemptResult {
  if (balance - amount < OVERDRAFT_LIMIT) {
    return {
      balanceAfter: balance,
      result: {
        success: false,
        notesDispensed: { ...EMPTY_NOTE_INVENTORY },
        updatedInventory: { ...inventory },
        message: `Withdrawal would exceed overdraft limit of £${Math.abs(OVERDRAFT_LIMIT)}.`,
      },
    };
  }

  const result = processWithdrawal(amount, inventory);
  if (!result.success) {
    return { balanceAfter: balance, result };
  }

  return {
    balanceAfter: balance - amount,
    result,
  };
}

describe("ATM note selection", () => {
  it("chooses a valid and deterministic combination for £140 from the initial inventory", () => {
    const selection = selectBestNoteCombination(140, INITIAL_NOTE_INVENTORY);

    expect(selection).toEqual({ 5: 0, 10: 3, 20: 5 });
  });

  it("chooses a balanced combination when more than one valid option exists", () => {
    const selection = selectBestNoteCombination(40, { 5: 4, 10: 2, 20: 1 });

    expect(selection).toEqual({ 5: 0, 10: 2, 20: 1 });
  });

  it("returns null when no exact note combination exists", () => {
    const selection = selectBestNoteCombination(15, { 5: 0, 10: 2, 20: 2 });

    expect(selection).toBeNull();
  });

  it("uses deterministic tie-breakers when spread and note count are equal", () => {
    const selection = selectBestNoteCombination(30, { 5: 6, 10: 3, 20: 3 });

    expect(selection).toEqual({ 5: 0, 10: 1, 20: 1 });
  });
});

describe("ATM withdrawal failure cases", () => {
  it("returns insufficient-cash failure when amount exceeds total ATM cash", () => {
    const result = processWithdrawal(60, { 5: 1, 10: 1, 20: 2 });

    expect(result).toEqual({
      success: false,
      notesDispensed: { 5: 0, 10: 0, 20: 0 },
      updatedInventory: { 5: 1, 10: 1, 20: 2 },
      message: "ATM has insufficient cash for this withdrawal.",
    });
  });

  it("returns exact-dispense failure when ATM has cash but no valid combination", () => {
    const result = processWithdrawal(15, { 5: 0, 10: 2, 20: 2 });

    expect(result).toEqual({
      success: false,
      notesDispensed: { 5: 0, 10: 0, 20: 0 },
      updatedInventory: { 5: 0, 10: 2, 20: 2 },
      message: "Cannot dispense exact amount with current note inventory.",
    });
  });

  it("rejects invalid amounts that are not positive multiples of £5", () => {
    const invalidAmounts = [-5, 0, 3, 33];

    invalidAmounts.forEach((amount) => {
      const result = processWithdrawal(amount, INITIAL_NOTE_INVENTORY);

      expect(result).toEqual({
        success: false,
        notesDispensed: { 5: 0, 10: 0, 20: 0 },
        updatedInventory: INITIAL_NOTE_INVENTORY,
        message: "Amount must be a positive multiple of £5.",
      });
    });
  });

  it("keeps failure result shape consistent across different failure reasons", () => {
    const results: WithdrawalResult[] = [
      processWithdrawal(999, INITIAL_NOTE_INVENTORY),
      processWithdrawal(33, INITIAL_NOTE_INVENTORY),
      processWithdrawal(15, { 5: 0, 10: 2, 20: 2 }),
    ];

    results.forEach((result) => {
      expect(result.success).toBe(false);
      expect(result.notesDispensed).toEqual({ 5: 0, 10: 0, 20: 0 });
      expect(result.updatedInventory).toBeDefined();
      expect(typeof result.message).toBe("string");
    });
  });
});

describe("ATM sequence behavior", () => {
  it("depletes notes correctly after each successful challenge withdrawal", () => {
    const [first, second, third] = processWithdrawalSequence([140, 50, 90], INITIAL_NOTE_INVENTORY);

    expect(first).toMatchObject({
      success: true,
      updatedInventory: { 5: 4, 10: 12, 20: 2 },
    });

    expect(second).toMatchObject({
      success: true,
      updatedInventory: { 5: 4, 10: 11, 20: 0 },
    });

    expect(third).toMatchObject({
      success: true,
      updatedInventory: { 5: 2, 10: 3, 20: 0 },
    });
  });

  it("continues processing later withdrawals after a failed withdrawal", () => {
    const results = processWithdrawalSequence([35, 20], { 5: 0, 10: 2, 20: 2 });

    expect(results[0]).toMatchObject({
      success: false,
      updatedInventory: { 5: 0, 10: 2, 20: 2 },
    });

    expect(results[1]).toMatchObject({
      success: true,
      notesDispensed: { 5: 0, 10: 0, 20: 1 },
      updatedInventory: { 5: 0, 10: 2, 20: 1 },
    });
  });
});

describe("ATM account-level behavior with overdraft boundary", () => {
  it("allows withdrawal that lands exactly on the overdraft boundary of -100", () => {
    const { balanceAfter, result } = attemptAccountWithdrawal({
      balance: 40,
      amount: 140,
      inventory: INITIAL_NOTE_INVENTORY,
    });

    expect(result.success).toBe(true);
    expect(balanceAfter).toBe(-100);
  });

  it("rejects withdrawal that would cross below the overdraft boundary of -100", () => {
    const inventoryBefore = { ...INITIAL_NOTE_INVENTORY };
    const { balanceAfter, result } = attemptAccountWithdrawal({
      balance: 39,
      amount: 140,
      inventory: inventoryBefore,
    });

    expect(result).toEqual({
      success: false,
      notesDispensed: { 5: 0, 10: 0, 20: 0 },
      updatedInventory: inventoryBefore,
      message: "Withdrawal would exceed overdraft limit of £100.",
    });
    expect(balanceAfter).toBe(39);
  });

  it("updates account balance and inventory after each successful withdrawal", () => {
    let balance = 300;
    let inventory: NoteInventory = { ...INITIAL_NOTE_INVENTORY };

    const first = attemptAccountWithdrawal({ balance, amount: 140, inventory });
    expect(first.result.success).toBe(true);
    balance = first.balanceAfter;
    inventory = first.result.updatedInventory;

    expect(balance).toBe(160);
    expect(inventory).toEqual({ 5: 4, 10: 12, 20: 2 });

    const second = attemptAccountWithdrawal({ balance, amount: 50, inventory });
    expect(second.result.success).toBe(true);
    balance = second.balanceAfter;
    inventory = second.result.updatedInventory;

    expect(balance).toBe(110);
    expect(inventory).toEqual({ 5: 4, 10: 11, 20: 0 });
  });
});
