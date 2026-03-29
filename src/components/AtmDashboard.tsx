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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">ATM</h1>
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <LogOut className="mr-1 h-4 w-4" /> End Session
          </Button>
        </div>

        {/* Balance */}
        <Card className={isOverdrawn ? "border-warning" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isOverdrawn ? "bg-warning/15" : "bg-primary/10"}`}>
                <Wallet className={`h-5 w-5 ${isOverdrawn ? "text-warning" : "text-primary"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-3xl font-bold tabular-nums ${isOverdrawn ? "text-warning" : "text-foreground"}`}>
                  £{balance.toFixed(2)}
                </p>
              </div>
            </div>
            {isOverdrawn && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" />
                You are overdrawn. Overdraft limit: £100
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

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

        {/* Note Inventory */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4" /> Note Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {([5, 10, 20] as const).map((denom) => (
                <div key={denom} className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-lg font-bold text-foreground">£{denom}</p>
                  <p className="text-sm text-muted-foreground">{notes[denom]} left</p>
                </div>
              ))}
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
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">-£{tx.amount}</span>
                      <span className="ml-2 text-muted-foreground">
                        {tx.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={`font-medium tabular-nums ${tx.balanceAfter < 0 ? "text-warning" : "text-foreground"}`}>
                      £{tx.balanceAfter.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
