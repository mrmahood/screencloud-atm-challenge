

## Refinement Plan

### Goal
Polish the existing ATM app for clarity, readability, and a more professional feel across all seven areas listed, without adding complexity.

---

### Changes by File

#### 1. `src/components/PinEntry.tsx` — Loading state and error handling
- Add "Verifying..." text next to the spinner in the submit button so the loading state is more communicative
- Wrap the error message in a styled alert-like container with a warning icon (using the existing `AlertTriangle` icon) instead of a bare `<p>` tag
- Add a subtle shake animation class on the input when an error occurs (CSS keyframe in `index.css`)
- Differentiate network errors ("Unable to connect. Please try again.") from PIN errors by catching `TypeError` from fetch

#### 2. `src/components/AtmDashboard.tsx` — All dashboard improvements

**Balance display hierarchy:**
- Make the balance label slightly larger and add "Available" prefix: "Available Balance"
- Add the overdraft limit as a secondary line below balance: "Overdraft limit: -£100.00" in muted text, always visible (not just when overdrawn)

**Overdrawn warning design:**
- Use the `Alert` component from `ui/alert.tsx` with a custom warning variant instead of a raw `div`, giving it proper structure with `AlertTitle` and `AlertDescription`
- Show how much overdraft remains: "You have £X.XX remaining before your overdraft limit"

**Note inventory visibility:**
- Add a colored indicator dot (green/amber/red) next to each denomination count: green if > 5, amber if 1-5, red if 0
- When a denomination is at 0, grey out that tile and show "Empty"

**Transaction history readability:**
- Add a "Withdrawal" label and show dispensed note breakdown per transaction (requires adding `dispensed` notes to the `Transaction` type)
- Use a subtle divider between transactions
- Format time more readably: "2:34 PM" style via `toLocaleTimeString` options
- Add a running transaction count badge in the section header

**Withdrawal buttons:**
- Disable individual withdraw buttons when the specific amount cannot be dispensed (insufficient notes or would exceed overdraft), with a tooltip explaining why
- Clear any previous error message when a new withdrawal succeeds

**Reset flow:**
- Replace the ghost button with a confirmation step: first click shows "Are you sure?" inline with Confirm/Cancel buttons, preventing accidental session termination

#### 3. `src/hooks/useAtm.ts` — Logic refinements
- Add `dispensedNotes: NoteInventory` field to the `Transaction` interface so the dashboard can show the breakdown
- Store dispensed notes in each transaction record
- Export `OVERDRAFT_LIMIT` constant so the dashboard can reference it
- Add a `canWithdraw(amount)` helper that returns `{ possible: boolean; reason?: string }` without side effects, for the UI to pre-check button states

#### 4. `src/index.css` — Minor additions
- Add a `@keyframes shake` animation for the PIN input error state

---

### What stays the same
- Overall layout and card-based structure
- Color theme and design tokens
- Hook-based architecture with logic in `useAtm`
- No backend, no database, no new dependencies

