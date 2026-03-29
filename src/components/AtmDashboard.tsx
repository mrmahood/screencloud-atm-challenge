import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Clock,
  History,
  Loader2,
  LogOut,
  Receipt,
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

  // Keep success banner mounted during fade-out so CSS transition can play
  const [successVisible, setSuccessVisible] = useState(false);
  const [successFading, setSuccessFading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();
  const successRef = useRef<HTMLDivElement>(null);
  const [bannerHeight, setBannerHeight] = useState<number>(0);

  useEffect(() => {
    if (stage === "collect") {
      setSuccessVisible(true);
      setSuccessFading(false);
    }
  }, [stage]);

  // Measure banner height once it's rendered in "collect" stage
  useEffect(() => {
    if (successVisible && !successFading && successRef.current) {
      setBannerHeight(successRef.current.scrollHeight);
    }
  }, [successVisible, successFading]);

  useEffect(() => {
    if (successVisible && stage === "idle") {
      // small delay so the browser paints the full-height state first
      requestAnimationFrame(() => {
        setSuccessFading(true);
      });
      fadeTimer.current = setTimeout(() => {
        setSuccessVisible(false);
        setSuccessFading(false);
        setBannerHeight(0);
      }, 400);
    }
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, [stage, successVisible]);

  const parsedWithdrawalAmount = Number(withdrawalAmount);
  const canSubmitWithdrawal =
    Number.isFinite(parsedWithdrawalAmount) &&
    parsedWithdrawalAmount > 0 &&
    parsedWithdrawalAmount % 5 === 0;

  const suggestedAmounts = useMemo(
    () => getSuggestedWithdrawalAmounts(notes, balance),
    [notes, balance],
  );

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
          }, 2400);
        }, 800);
      }, 600);
    },
    [isBusy, onWithdraw, onSetError],
  );

  const handleSubmitWithdraw = () => {
    const amount = Number(withdrawalAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount % 5 !== 0) {
      onSetError("Please enter a valid amount in multiples of £5.");
      return;
    }
    runWithdraw(amount);
  };

  const handleChipClick = (amount: number) => {
    setWithdrawalAmount(String(amount));
    onSetError(null);
  };

  /* Stage banner */
  const stageBanner = (() => {
    switch (stage) {
      case "processing":
        return (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-5 py-3.5 text-sm font-medium text-primary animate-fade-in">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            Processing transaction…
          </div>
        );
      case "dispensing":
        return (
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 px-5 py-3.5 text-sm font-medium text-primary animate-fade-in">
            <Banknote className="h-4 w-4 shrink-0" />
            Dispensing cash…
          </div>
        );
      case "collect":
        return (
          <div className="flex items-center gap-3 rounded-xl bg-accent/60 border border-accent px-5 py-3.5 text-sm font-medium text-foreground animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
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
          <div className="flex items-center gap-1.5 animate-fade-in">
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
        className={`transition-all duration-300 border ${
          isOverdrawn
            ? "border-warning/40 shadow-[0_2px_12px_-4px_hsl(var(--warning)/0.12)]"
            : "border-border/60 shadow-[0_2px_16px_-6px_hsl(var(--primary)/0.08)]"
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
            <p className="mt-3 flex items-center gap-1.5 text-sm text-warning animate-fade-in">
              <AlertTriangle className="h-3.5 w-3.5" />
              You are £{Math.abs(balance).toFixed(2)} overdrawn.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stage / status banners */}
      {stageBanner}

      {/* Lingering success banner — stays mounted during fade-out */}
      {successVisible && stage === "idle" && (
        <div
          className={[
            "flex items-center gap-3 rounded-xl bg-accent/60 border border-accent px-5 py-3.5 text-sm font-medium text-foreground",
            "transition-all duration-500 ease-out",
            successFading
              ? "opacity-0 -translate-y-1"
              : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          Please take your cash — £{lastSuccess} dispensed.
        </div>
      )}

      {/* Error banner */}
      {error && stage === "idle" && (
        <div className="flex items-center gap-3 rounded-xl bg-destructive/8 border border-destructive/15 px-5 py-3.5 text-sm font-medium text-destructive animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Withdraw */}
      <Card
        className={`border border-border/60 transition-all duration-200 ${
          isBusy ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-foreground">
            Withdraw Cash
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmitWithdraw();
            }}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/60">
                £
              </span>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawalAmount}
                onChange={(e) => {
                  setWithdrawalAmount(e.target.value);
                  onSetError(null);
                }}
                className="pl-7 tabular-nums h-11 text-base transition-shadow duration-150 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                min={5}
                step={5}
              />
            </div>
            <Button
              type="submit"
              className="sm:w-40 w-full h-11 text-sm font-semibold tracking-wide transition-all duration-150 active:scale-[0.98]"
              disabled={!canSubmitWithdrawal || isBusy}
            >
              Withdraw
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground/50">
            Multiples of £5 only
          </p>

          {suggestedAmounts.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-muted-foreground">
                Quick select
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleChipClick(amount)}
                    className={[
                      "inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-sm font-medium tabular-nums",
                      "border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      "disabled:opacity-40 disabled:pointer-events-none",
                      String(amount) === withdrawalAmount
                        ? "border-primary/40 bg-primary/8 text-primary shadow-sm"
                        : "border-border/60 bg-secondary/50 text-foreground hover:bg-secondary hover:border-border active:scale-[0.96] active:bg-secondary/80",
                    ].join(" ")}
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
      <Card className="border border-border/40">
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 mb-3">
                <Receipt className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                Your withdrawals will appear here
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {transactions.map((tx, index) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/30"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50">
                      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold tabular-nums text-foreground">
                        −£{tx.amount.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <Clock className="h-2.5 w-2.5" />
                        {tx.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        tx.balanceAfter < 0
                          ? "text-warning"
                          : "text-muted-foreground"
                      }`}
                    >
                      £{tx.balanceAfter.toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
