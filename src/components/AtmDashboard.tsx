import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NoteInventory,
  WithdrawalResult,
  calculateTotalCash,
  getSuggestedWithdrawalAmounts,
} from "@/lib/atm";
import { Transaction } from "@/hooks/useAtm";
import { AlertTriangle, Banknote, History, LogOut, Wallet } from "lucide-react";

interface Props {
  balance: number;
  notes: NoteInventory;
  transactions: Transaction[];
  error: string | null;
  onWithdraw: (amount: number) => WithdrawalResult;
  onSetError: (err: string | null) => void;
  onReset: () => void;
}

export default function AtmDashboard({
  balance,
  notes,
  transactions,
  error,
  onWithdraw,
  onSetError,
  onReset,
}: Props) {
  const isOverdrawn = balance < 0;
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");

  const suggestedAmounts = useMemo(() => getSuggestedWithdrawalAmounts(notes, balance), [notes, balance]);

  const handleWithdraw = (amount: number) => {
    const result = onWithdraw(amount);

    if (!result.success) {
      onSetError(result.message);
      return;
    }

    onSetError(null);
    setWithdrawalAmount("");
  };

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }

    handleWithdraw(amount);
  };

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }

    handleWithdraw(amount);
  };

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }

    handleWithdraw(amount);
  };

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);

    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }

    handleWithdraw(amount);
  };

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }
    handleWithdraw(amount);
  };

  const showSuggestions = balance > 0 && suggestedAmounts.length > 0;

  return (
    <div className="mx-auto max-w-lg space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">ATM</h1>
        {!confirmingReset ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setConfirmingReset(true)}
          >
            <LogOut className="h-4 w-4" />
            End Session
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">End session?</span>
            <Button size="sm" variant="destructive" onClick={onReset}>
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmingReset(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

        {/* Withdraw */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Withdraw Cash</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="number"
                min={5}
                step={5}
                inputMode="numeric"
                placeholder="Enter amount (e.g. 50)"
                value={withdrawalAmount}
                onChange={(event) => setWithdrawalAmount(event.target.value)}
              />
              <Button className="sm:w-40" onClick={handleSubmitWithdraw}>
                Withdraw
              </Button>
            </div>

            {suggestedAmounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Suggested amounts</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleWithdraw(amount)}
                    >
                      £{amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Withdraw */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Withdraw Cash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                £
              </span>
              <Input
                type="number"
                min={5}
                step={5}
                inputMode="numeric"
                className="pl-7"
                placeholder="Amount (multiples of £5)"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitWithdraw()}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-right">
              Total cash available: £{calculateTotalCash(notes)}
            </p>
          </CardContent>
        </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-start justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        -£{tx.amount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Withdrawal
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(tx.timestamp)}
                    </p>
                  </div>
                  <span
                    className={`pt-0.5 text-sm font-medium tabular-nums ${tx.balanceAfter < 0 ? "text-warning" : "text-foreground"}`}
                  >
                    £{tx.balanceAfter.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
