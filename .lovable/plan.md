

## Plan: Rewrite ATM Dashboard for Real ATM Feel

### `src/components/AtmDashboard.tsx` — Full rewrite
- Withdrawal amount input
- Primary Withdraw button
- 4–6 dynamic suggested amount chips
- Helper text indicating multiples of £5
- Single balance card
- Single error banner
- Note inventory
- Transaction history
- Reset/end session flow

### Suggestions behavior
- Generated from `getSuggestedWithdrawalAmounts(...)`
- Based on current note inventory
- Capped at £100
- Not based on overdraft headroom or "spending power"
- Optionally filtered to avoid showing amounts above current positive balance, if easy to support cleanly

### `src/hooks/useAtm.ts`
- Fix `dispensedNotes: dispensed` → `dispensedNotes: result.notesDispensed`
- Remove `canWithdraw` from return if no longer used
- Export `OVERDRAFT_LIMIT`

### `src/pages/Index.tsx`
- Remove `onCanWithdraw` prop

### `src/lib/atm.ts`
- No changes unless needed to support optional balance-aware filtering of suggestions

