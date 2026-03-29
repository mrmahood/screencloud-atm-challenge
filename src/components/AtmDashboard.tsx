import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  NoteInventory,
  WithdrawalResult,
  getSuggestedWithdrawalAmounts,
} from "@/lib/atm";
import { Transaction } from "@/hooks/useAtm";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  History,
  Loader2,
  LogOut,
  Wallet,
} from "lucide-react";

interface Props {
  balance: number;
  notes: NoteInventory;
  transactions: Transaction[];
  error: string | null;
  onWithdraw: (amount: number) => WithdrawalResult;
  onSetError: (err: string | null) => void;
  onReset: () => void;
}

type TxStage = "idle" | "processing" | "dispensing" | "collect";

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
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [stage, setStage] = useState<TxStage>("idle");
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const stageTimer = useRef<ReturnType<typeof setTimeout>>();
  const isBusy = stage !== "idle";

  const parsedWithdrawalAmount = Number(withdrawalAmount);
  const canSubmitWithdrawal =
    Number.isFinite(parsedWithdrawalAmount) &&
    parsedWithdrawalAmount > 0 &&
    parsedWithdrawalAmount % 5 === 0;

  const suggestedAmounts = useMemo(
    () => getSuggestedWithdrawalAmounts(notes, balance),
    [notes, balance],
  );

  const clearStageTimer = () => {
    if (stageTimer.current) clearTimeout(stageTimer.current);
  };

  const runWithdraw = useCallback(
    (amount: number) => {
      if (isBusy) return;
      onSetError(null);
      setStage("processing");

      stageTimer.current = setTimeout(() => {
        const result = onWithdraw(amount);

        if (!result.success) {
          setStage("idle");
          onSetError(result.message);
          return;
        }

        setLastSuccess(amount);
        setWithdrawalAmount("");
        setStage("dispensing");

        stageTimer.current = setTimeout(() => {
          setStage("collect");

          stageTimer.current = setTimeout(() => {
            setStage("idle");
          }, 2500);
        }, 800);
      }, 600);
    },
    [isBusy, onWithdraw, onSetError],
  );

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Enter a valid withdrawal amount in multiples of £5.");
      return;
    }
    runWithdraw(amount);
  };

  /* Stage banner content */
  const stageBanner = (() => {
    switch (stage) {
      case "processing":
        return (
          <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 text-sm font-medium text-primary animate-slide-down">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Processing transaction…
          </div>
        );
      case "dispensing":
        return (
          <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3 text-sm font-medium text-primary animate-slide-down">
            <Banknote className="h-4 w-4 shrink-0" />
            Dispensing cash…
          </div>
        );
      case "collect":
        return (
          <div className="flex items-center gap-2.5 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-400 animate-slide-down">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Please take your cash — £{lastSuccess} dispensed.
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            ATM
          </h1>
        </div>
        {!confirmingReset ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setConfirmingReset(true)}
            disabled={isBusy}
          >
            <LogOut className="h-3.5 w-3.5" />
            End Session
          </Button>
        ) : (
          <div className="flex items-center gap-1.5 animate-fade-in-up">
            <span className="text-xs text-muted-foreground mr-1">
              End session?
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs px-2.5"
              onClick={onReset}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5"
              onClick={() => setConfirmingReset(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Balance — Hero */}
      <Card
        className={`card-hero transition-all duration-300 ${
          isOverdrawn
            ? "border-warning/50 shadow-[0_2px_12px_-4px_hsl(var(--warning)/0.15)]"
            : "shadow-[0_2px_16px_-6px_hsl(var(--primary)/0.1)]"
        }`}
      >
        <CardContent className="pt-6 pb-5 px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
            Available Balance
          </p>
          <p
            className={`text-4xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${
              isOverdrawn ? "text-warning" : "text-foreground"
            }`}
          >
            £{balance.toFixed(2)}
          </p>
          {isOverdrawn && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-warning animate-fade-in-up">
              <AlertTriangle className="h-3.5 w-3.5" />
              You are £{Math.abs(balance).toFixed(2)} overdrawn.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stage / status banners */}
      {stageBanner}

      {/* Error banner */}
      {error && stage === "idle" && (
        <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive animate-slide-down">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Withdraw */}
      <Card className={`card-elevated transition-opacity duration-200 ${isBusy ? "opacity-60 pointer-events-none" : ""}`}>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-foreground">
            Withdraw Cash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/70">
                £
              </span>
              <Input
                type="number"
                placeholder="Amount"
                value={withdrawalAmount}
                onChange={(e) => {
                  setWithdrawalAmount(e.target.value);
                  onSetError(null);
                }}
                className="pl-7 tabular-nums"
                min={5}
                step={5}
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitWithdraw();
              }}
            >
              <Button type="submit" className="sm:w-40 w-full" disabled={!canSubmitWithdrawal || isBusy}>
                Withdraw
              </Button>
            </form>
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
                    disabled={isBusy}
                    onClick={() => runWithdraw(amount)}
                  >
                    £{amount}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4" /> Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-foreground">-£{tx.amount}</span>
                    <span className="ml-2 text-muted-foreground">
                      {tx.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span
                    className={`font-medium tabular-nums ${tx.balanceAfter < 0 ? "text-warning" : "text-foreground"}`}
                    title="Balance after withdrawal"
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
