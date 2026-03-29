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
  ArrowDownRight,
  Banknote,
  CheckCircle2,
  Clock,
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

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [stage, setStage] = useState<TxStage>("idle");
  const [lastSuccess, setLastSuccess] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const suggestedAmounts = useMemo(
    () => getSuggestedWithdrawalAmounts(notes, balance),
    [notes, balance],
  );

  const showSuggestions = balance > 0 && suggestedAmounts.length > 0;
  const isBusy = stage !== "idle";

  const runWithdraw = useCallback(
    (amount: number) => {
      if (isBusy) return;
      clearTimeout(timerRef.current);
      onSetError(null);
      setLastSuccess(null);
      setStage("processing");

      // Stage 1: "Processing…" (600ms) → execute logic
      timerRef.current = setTimeout(() => {
        const result = onWithdraw(amount);

        if (!result.success) {
          onSetError(result.message);
          setStage("idle");
          return;
        }

        // Stage 2: "Dispensing cash…" (800ms)
        setStage("dispensing");
        setWithdrawalAmount("");

        timerRef.current = setTimeout(() => {
          // Stage 3: "Please take your cash" (2.5s)
          setStage("collect");
          setLastSuccess(amount);

          timerRef.current = setTimeout(() => {
            setStage("idle");
            setLastSuccess(null);
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
          <div className="flex items-center gap-2.5 rounded-lg bg-primary/6 border border-primary/15 px-4 py-3 text-sm font-medium text-primary animate-slide-down">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Processing transaction…
          </div>
        );
      case "dispensing":
        return (
          <div className="flex items-center gap-2.5 rounded-lg bg-primary/6 border border-primary/15 px-4 py-3 text-sm font-medium text-primary animate-slide-down">
            <Banknote className="h-4 w-4 shrink-0" />
            Dispensing cash…
          </div>
        );
      case "collect":
        return (
          <div className="flex items-center gap-2.5 rounded-lg bg-success/8 border border-success/20 px-4 py-3 text-sm font-medium text-success animate-slide-down">
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
        <div className="flex items-center gap-2.5 rounded-lg bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm font-medium text-destructive animate-slide-down">
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
                min={5}
                step={5}
                inputMode="numeric"
                className="h-11 pl-7 text-base tabular-nums bg-background/50 border-border/80 focus:border-primary/40 transition-colors"
                placeholder="Amount"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitWithdraw()}
                disabled={isBusy}
              />
            </div>
            <Button
              className="h-11 sm:w-36 font-semibold text-sm shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
              onClick={handleSubmitWithdraw}
              disabled={isBusy}
            >
              Withdraw
            </Button>
          </div>

          {showSuggestions && (
            <div className="space-y-2 pt-0.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Quick amounts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedAmounts
                  .sort((a, b) => a - b)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setWithdrawalAmount(String(amount))}
                      disabled={isBusy}
                      className={`inline-flex h-8 items-center rounded-md border px-3.5 text-sm font-medium tabular-nums transition-all duration-150 
                        ${
                          withdrawalAmount === String(amount)
                            ? "border-primary/40 bg-primary/8 text-primary shadow-sm"
                            : "border-border/60 bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:border-border active:scale-[0.97]"
                        }`}
                    >
                      £{amount}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="card-elevated border-border/40">
        <CardHeader className="pb-2 px-5 pt-4">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Withdrawals will appear here
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {transactions.map((tx, i) => (
                <li
                  key={tx.id}
                  className="group flex items-center justify-between rounded-md px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/40"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/60">
                      <ArrowDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        −£{tx.amount}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {formatTime(tx.timestamp)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      tx.balanceAfter < 0
                        ? "text-warning"
                        : "text-muted-foreground"
                    }`}
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
