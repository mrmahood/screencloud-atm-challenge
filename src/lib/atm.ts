export const NOTE_DENOMINATIONS = [20, 10, 5] as const;

export type Denomination = (typeof NOTE_DENOMINATIONS)[number];

export type NoteInventory = Record<Denomination, number>;

export type WithdrawalResult =
  | {
      success: true;
      notesDispensed: NoteInventory;
      updatedInventory: NoteInventory;
      message: string;
    }
  | {
      success: false;
      notesDispensed: NoteInventory;
      updatedInventory: NoteInventory;
      message: string;
    };

export type NoteCombinationScore = [
  evennessSpread: number,
  totalNotes: number,
  preferMoreTwenties: number,
  preferMoreTens: number,
  preferMoreFives: number,
];

export const EMPTY_NOTE_INVENTORY: NoteInventory = { 5: 0, 10: 0, 20: 0 };

export const INITIAL_NOTE_INVENTORY: NoteInventory = { 5: 4, 10: 15, 20: 7 };

export function calculateTotalCash(inventory: NoteInventory): number {
  return NOTE_DENOMINATIONS.reduce((sum, denomination) => {
    return sum + denomination * inventory[denomination];
  }, 0);
}

function createFailureResult(message: string, inventory: NoteInventory): WithdrawalResult {
  return {
    success: false,
    notesDispensed: { ...EMPTY_NOTE_INVENTORY },
    updatedInventory: { ...inventory },
    message,
  };
}

function subtractDispensedNotes(inventory: NoteInventory, dispensed: NoteInventory): NoteInventory {
  return {
    5: inventory[5] - dispensed[5],
    10: inventory[10] - dispensed[10],
    20: inventory[20] - dispensed[20],
  };
}

function calculateEvennessSpread(notesDispensed: NoteInventory): number {
  const nonZeroCounts = NOTE_DENOMINATIONS
    .map((denomination) => notesDispensed[denomination])
    .filter((count) => count > 0);

  if (nonZeroCounts.length <= 1) {
    return 0;
  }

  return Math.max(...nonZeroCounts) - Math.min(...nonZeroCounts);
}

function calculateTotalNotes(notesDispensed: NoteInventory): number {
  return NOTE_DENOMINATIONS.reduce((sum, denomination) => {
    return sum + notesDispensed[denomination];
  }, 0);
}

function buildNoteCombinationScore(notesDispensed: NoteInventory): NoteCombinationScore {
  return [
    calculateEvennessSpread(notesDispensed),
    calculateTotalNotes(notesDispensed),
    -notesDispensed[20],
    -notesDispensed[10],
    -notesDispensed[5],
  ];
}

function isBetterNoteCombinationScore(
  candidate: NoteCombinationScore,
  currentBest: NoteCombinationScore,
): boolean {
  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] !== currentBest[index]) {
      return candidate[index] < currentBest[index];
    }
  }

  return false;
}

export function selectBestNoteCombination(
  amount: number,
  inventory: NoteInventory,
): NoteInventory | null {
  let bestCombination: NoteInventory | null = null;
  let bestScore: NoteCombinationScore | null = null;

  const maxTwenties = Math.min(inventory[20], Math.floor(amount / 20));
  for (let twenties = 0; twenties <= maxTwenties; twenties += 1) {
    const remainingAfterTwenties = amount - twenties * 20;
    const maxTens = Math.min(inventory[10], Math.floor(remainingAfterTwenties / 10));

    for (let tens = 0; tens <= maxTens; tens += 1) {
      const remainingAfterTens = remainingAfterTwenties - tens * 10;
      if (remainingAfterTens % 5 !== 0) continue;

      const fives = remainingAfterTens / 5;
      if (fives > inventory[5]) continue;

      const candidate: NoteInventory = { 5: fives, 10: tens, 20: twenties };
      const candidateScore = buildNoteCombinationScore(candidate);

      if (!bestCombination || !bestScore || isBetterNoteCombinationScore(candidateScore, bestScore)) {
        bestCombination = candidate;
        bestScore = candidateScore;
      }
    }
  }

  return bestCombination;
}

export function processWithdrawal(amount: number, inventory: NoteInventory): WithdrawalResult {
  if (!Number.isInteger(amount) || amount <= 0 || amount % 5 !== 0) {
    return createFailureResult("Amount must be a positive multiple of £5.", inventory);
  }

  if (amount > calculateTotalCash(inventory)) {
    return createFailureResult("This amount is unavailable from this ATM right now. Please try a different amount.", inventory);
  }

  const notesDispensed = selectBestNoteCombination(amount, inventory);
  if (!notesDispensed) {
    return createFailureResult(
      "Unable to dispense this exact amount. Please try a different amount.",
      inventory,
    );
  }

  return {
    success: true,
    notesDispensed,
    updatedInventory: subtractDispensedNotes(inventory, notesDispensed),
    message: `Dispensed £${amount} successfully.`,
  };
}


const PREFERRED_SUGGESTED_AMOUNTS = [
  20, 40, 60, 80, 100,
  10, 30, 50, 70, 90,
  5, 15, 25, 35, 45, 55, 65, 75, 85, 95,
] as const;

export function getSuggestedWithdrawalAmounts(inventory: NoteInventory, balance: number): number[] {
  if (balance <= 0) {
    return [];
  }

  const maxSuggestedAmount = Math.min(100, balance);
  const suggestions: number[] = [];

  for (const amount of PREFERRED_SUGGESTED_AMOUNTS) {
    if (amount > maxSuggestedAmount || amount % 5 !== 0) {
      continue;
    }

    const isDispensable = processWithdrawal(amount, inventory).success;
    if (isDispensable) {
      suggestions.push(amount);
    }

    if (suggestions.length === 6) {
      return suggestions;
    }
  }

  if (suggestions.length >= 4) {
    return suggestions;
  }

  for (let amount = 5; amount <= maxSuggestedAmount; amount += 5) {
    if (suggestions.includes(amount)) {
      continue;
    }

    const isDispensable = processWithdrawal(amount, inventory).success;
    if (!isDispensable) {
      continue;
    }

    suggestions.push(amount);
    if (suggestions.length === 6) {
      break;
    }
  }

  return suggestions;
}

export function processWithdrawalSequence(
  amounts: number[],
  startingInventory: NoteInventory = INITIAL_NOTE_INVENTORY,
): WithdrawalResult[] {
  const results: WithdrawalResult[] = [];
  let currentInventory = { ...startingInventory };

  for (const amount of amounts) {
    const result = processWithdrawal(amount, currentInventory);
    results.push(result);

    if (result.success) {
      currentInventory = result.updatedInventory;
    }
  }

  return results;
}
