import { describe, expect, it } from "vitest";
import {
  EMPTY_NOTE_INVENTORY,
  INITIAL_NOTE_INVENTORY,
  NoteInventory,
  WithdrawalResult,
  processWithdrawal,
  processWithdrawalSequence,
  selectBestNoteCombination,
  getSuggestedWithdrawalAmounts,
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


describe("ATM suggested withdrawal amounts", () => {

  it("is deterministic for the same inventory input", () => {
    const inventory: NoteInventory = { 5: 4, 10: 3, 20: 2 };

    const first = getSuggestedWithdrawalAmounts(inventory, 100);
    const second = getSuggestedWithdrawalAmounts(inventory, 100);

    expect(first).toEqual(second);
  });

  it("returns 4-6 preferred round suggestions from current inventory", () => {
    const suggestions = getSuggestedWithdrawalAmounts(INITIAL_NOTE_INVENTORY, 300);

    expect(suggestions.length).toBeGreaterThanOrEqual(4);
    expect(suggestions.length).toBeLessThanOrEqual(6);
    expect(suggestions).toEqual([20, 40, 60, 80, 100, 10]);
  });

  it("returns only dispensable amounts that are multiples of 5 and capped at 100", () => {
    const suggestions = getSuggestedWithdrawalAmounts({ 5: 1, 10: 0, 20: 0 }, 200);

    expect(suggestions).toEqual([5]);
    suggestions.forEach((amount) => {
      expect(amount % 5).toBe(0);
      expect(amount).toBeLessThanOrEqual(100);
      expect(amount).toBeLessThanOrEqual(200);
      expect(processWithdrawal(amount, { 5: 1, 10: 0, 20: 0 }).success).toBe(true);
    });
  });

  it("falls back to any valid multiples of 5 when fewer than 4 preferred amounts are available", () => {
    const suggestions = getSuggestedWithdrawalAmounts({ 5: 2, 10: 0, 20: 1 }, 200);

    expect(suggestions).toEqual([20, 10, 30, 5, 15, 25]);
  });

  it("does not suggest amounts greater than the current positive balance", () => {
    const suggestions = getSuggestedWithdrawalAmounts(INITIAL_NOTE_INVENTORY, 50);

    expect(suggestions.every((amount) => amount <= 50)).toBe(true);
    expect(suggestions).toEqual([20, 40, 10, 30, 50, 5]);
  });

  it("returns no suggestions for zero or negative balances", () => {
    expect(getSuggestedWithdrawalAmounts(INITIAL_NOTE_INVENTORY, 0)).toEqual([]);
    expect(getSuggestedWithdrawalAmounts(INITIAL_NOTE_INVENTORY, -20)).toEqual([]);
  });
});

function getPermutations(values: number[]): number[][] {
  if (values.length <= 1) {
    return [values];
  }

  const permutations: number[][] = [];
  values.forEach((value, index) => {
    const remaining = [...values.slice(0, index), ...values.slice(index + 1)];
    const remainingPermutations = getPermutations(remaining);

    remainingPermutations.forEach((permutation) => {
      permutations.push([value, ...permutation]);
    });
  });

  return permutations;
}

function assertSuggestionRules(suggestions: number[], inventory: NoteInventory, balance: number): void {
  suggestions.forEach((amount) => {
    expect(amount % 5).toBe(0);
    expect(amount).toBeLessThanOrEqual(100);
    expect(amount).toBeLessThanOrEqual(Math.max(balance, 0));
    expect(processWithdrawal(amount, inventory).success).toBe(true);
  });
}

describe("Michael withdrawal permutations (140, 50, 90)", () => {
  const requiredWithdrawals = [140, 50, 90] as const;
  const permutations = getPermutations([...requiredWithdrawals]);

  it("generates all 6 unique permutations", () => {
    const unique = new Set(permutations.map((permutation) => permutation.join("-")));

    expect(permutations).toHaveLength(6);
    expect(unique.size).toBe(6);
  });

  it.each(permutations)(
    "processes permutation %j with inventory/balance updates, overdraft checks, result shape consistency, and dynamic suggestions",
    (permutation) => {
      let balance = 170;
      let inventory: NoteInventory = { ...INITIAL_NOTE_INVENTORY };
      let remainingOverdraftFailures = 0;

      permutation.forEach((amount) => {
        const suggestionsBefore = getSuggestedWithdrawalAmounts(inventory, balance);
        assertSuggestionRules(suggestionsBefore, inventory, balance);

        const { balanceAfter, result } = attemptAccountWithdrawal({
          balance,
          amount,
          inventory,
        });

        if (result.success) {
          expect(result.notesDispensed).not.toEqual({ 5: 0, 10: 0, 20: 0 });
          expect(result.updatedInventory).not.toEqual(inventory);
          expect(balanceAfter).toBe(balance - amount);

          inventory = result.updatedInventory;
          balance = balanceAfter;
        } else {
          remainingOverdraftFailures += 1;
          expect(result.notesDispensed).toEqual({ 5: 0, 10: 0, 20: 0 });
          expect(result.updatedInventory).toEqual(inventory);
          expect(result.message).toBe("Withdrawal would exceed overdraft limit of £100.");
          expect(balanceAfter).toBe(balance);
        }

        const suggestionsAfter = getSuggestedWithdrawalAmounts(inventory, balance);
        assertSuggestionRules(suggestionsAfter, inventory, balance);
      });

      // With starting balance 170 and total withdrawal demand 280,
      // exactly one withdrawal must fail due to overdraft in any permutation.
      expect(remainingOverdraftFailures).toBe(1);
      expect(balance).toBe(-100);
    },
  );

  it("keeps suggested amounts unchanged when overdraft failure occurs and inventory does not change", () => {
    const inventory = { ...INITIAL_NOTE_INVENTORY };
    const suggestionsBefore = getSuggestedWithdrawalAmounts(inventory, -90);

    const { result } = attemptAccountWithdrawal({
      balance: -90,
      amount: 20,
      inventory,
    });

    expect(result.success).toBe(false);
    expect(result.updatedInventory).toEqual(inventory);

    const suggestionsAfter = getSuggestedWithdrawalAmounts(inventory, -90);
    expect(suggestionsAfter).toEqual(suggestionsBefore);
  });
});

describe("ATM denomination depletion and exhaustion", () => {
  it("handles £20 note exhaustion and still dispenses using remaining denominations", () => {
    const first = processWithdrawal(140, INITIAL_NOTE_INVENTORY);
    expect(first.success).toBe(true);

    const second = processWithdrawal(50, first.updatedInventory);
    expect(second.success).toBe(true);
    expect(second.updatedInventory[20]).toBe(0);

    const third = processWithdrawal(40, second.updatedInventory);
    expect(third).toMatchObject({
      success: true,
      notesDispensed: { 5: 0, 10: 4, 20: 0 },
    });
  });

  it("handles £10 note exhaustion and rejects amounts that are no longer dispensable", () => {
    const inventory: NoteInventory = { 5: 1, 10: 1, 20: 4 };

    const first = processWithdrawal(90, inventory);
    expect(first.success).toBe(true);
    expect(first.updatedInventory).toEqual({ 5: 1, 10: 0, 20: 0 });

    const second = processWithdrawal(10, first.updatedInventory);
    expect(second).toMatchObject({
      success: false,
      message: "Cannot dispense exact amount with current note inventory.",
    });
  });

  it("handles £5 note depletion and rejects valid amounts requiring £5 notes", () => {
    const inventory: NoteInventory = { 5: 1, 10: 10, 20: 2 };

    const first = processWithdrawal(35, inventory);
    expect(first.success).toBe(true);
    expect(first.updatedInventory[5]).toBe(0);

    const second = processWithdrawal(15, first.updatedInventory);
    expect(second).toMatchObject({
      success: false,
      message: "Cannot dispense exact amount with current note inventory.",
    });
  });

  it("updates suggested amounts correctly after denomination depletion", () => {
    const inventory: NoteInventory = { 5: 0, 10: 3, 20: 0 };
    const suggestions = getSuggestedWithdrawalAmounts(inventory, 100);

    expect(suggestions).toEqual([10, 30, 20]);
    suggestions.forEach((amount) => {
      expect(processWithdrawal(amount, inventory).success).toBe(true);
    });
  });

  it("processes Michael's £140, £50, £90 in all 6 permutations with evolving inventory when balance allows all", () => {
    const permutations = getPermutations([140, 50, 90]);

    permutations.forEach((permutation) => {
      let balance = 500;
      let inventory: NoteInventory = { ...INITIAL_NOTE_INVENTORY };

      permutation.forEach((amount) => {
        const { balanceAfter, result } = attemptAccountWithdrawal({ balance, amount, inventory });

        expect(result.success).toBe(true);
        expect(result.updatedInventory[20]).toBeGreaterThanOrEqual(0);
        expect(result.updatedInventory[10]).toBeGreaterThanOrEqual(0);
        expect(result.updatedInventory[5]).toBeGreaterThanOrEqual(0);

        inventory = result.updatedInventory;
        balance = balanceAfter;
      });

      expect(balance).toBe(220);
      expect(inventory).toEqual({ 5: 2, 10: 3, 20: 0 });
    });
  });
});
