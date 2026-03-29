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
  onCanWithdraw,
  onSetError,
  onReset,
}: Props) {
  const isOverdrawn = balance < 0;
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");

  const suggestedAmounts = useMemo(() => getSuggestedWithdrawalAmounts(notes), [notes]);

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

  const overdraftRemaining = Math.abs(OVERDRAFT_LIMIT) + balance;

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

          {/* Balance */}
          <Card className={isOverdrawn ? "border-warning" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isOverdrawn ? "bg-warning/15" : "bg-primary/10"}`}>
                  <Wallet className={`h-5 w-5 ${isOverdrawn ? "text-warning" : "text-primary"}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className={`text-3xl font-bold tabular-nums ${isOverdrawn ? "text-warning" : "text-foreground"}`}>
                    £{balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Overdraft limit: -£{Math.abs(OVERDRAFT_LIMIT).toFixed(2)}
                  </p>
                </div>
              </div>
              {isOverdrawn && (
                <Alert className="mt-4 border-warning/50 bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Account Overdrawn</AlertTitle>
                  <AlertDescription className="text-warning-foreground">
                    You have £{overdraftRemaining.toFixed(2)} remaining before your overdraft limit.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-right">
              Total cash available: £{calculateTotalCash(notes)}
            </p>
          </CardContent>
        </Card>

          {/* Withdraw */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Withdraw</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {WITHDRAWAL_OPTIONS.map((amt) => {
                const check = onCanWithdraw(amt);
                return (
                  <Tooltip key={amt}>
                    <TooltipTrigger asChild>
                      <span className="flex-1 min-w-[100px]">
                        <Button
                          variant="outline"
                          className="w-full h-12 text-lg font-semibold"
                          disabled={!check.possible}
                          onClick={() => handleWithdraw(amt)}
                        >
                          £{amt}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!check.possible && check.reason && (
                      <TooltipContent>{check.reason}</TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
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
                {([5, 10, 20] as const).map((denom) => {
                  const isEmpty = notes[denom] === 0;
                  return (
                    <div
                      key={denom}
                      className={`rounded-lg p-3 text-center ${isEmpty ? "bg-muted opacity-60" : "bg-secondary"}`}
                    >
                      <p className="text-lg font-bold text-foreground">£{denom}</p>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <NoteStatusDot count={notes[denom]} />
                        <p className="text-sm text-muted-foreground">
                          {isEmpty ? "Empty" : `${notes[denom]} left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground text-right">
                Total cash available: £{getTotalCash(notes)}
              </p>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4" /> Transaction History
                {transactions.length > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                    {transactions.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                <ul className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">-£{tx.amount}</span>
                          <span className="text-xs text-muted-foreground">Withdrawal</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {noteSummary(tx.dispensedNotes)} · {formatTime(tx.timestamp)}
                        </p>
                      </div>
                      <span className={`font-medium text-sm tabular-nums pt-0.5 ${tx.balanceAfter < 0 ? "text-warning" : "text-foreground"}`}>
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
    </TooltipProvider>
  );
}
