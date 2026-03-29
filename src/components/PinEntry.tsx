import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

interface PinEntryProps {
  onSuccess: (balance: number) => void;
}

export default function PinEntry({ onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(true);
  const [shake, setShake] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const sanitizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);
  const updatePin = (rawValue: string) => {
    setPin(sanitizePin(rawValue));
    setError(null);
  };
  const focusInput = () => hiddenRef.current?.focus();

  useEffect(() => { focusInput(); }, []);
  useEffect(() => {
    if (!loading && pin.length === 0) focusInput();
  }, [loading, pin]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      triggerShake();
      focusInput();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        "https://pinapi.screencloudsolutions.com/api/pin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Incorrect PIN. Please try again.");
      }

      const data = await res.json();
      onSuccess(data.currentBalance);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setPin("");
      triggerShake();
      focusInput();
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = pin.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[22rem] animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.12)]">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Secure Login
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter your 4-digit PIN
          </p>
        </div>

        <Card className="border-border/30 shadow-[0_8px_32px_-12px_hsl(var(--foreground)/0.08)]">
          <CardContent className="pt-10 pb-9 px-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Hidden input */}
              <input
                ref={hiddenRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={pin}
                onInput={(e) => updatePin(e.currentTarget.value)}
                onChange={(e) => updatePin(e.currentTarget.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  updatePin(e.clipboardData.getData("text"));
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="sr-only"
                autoFocus
                aria-label="PIN entry"
              />

              {/* Dot indicators */}
              <div
                className={`flex justify-center gap-5 cursor-text ${shake ? "animate-shake" : ""}`}
                onClick={focusInput}
                role="presentation"
              >
                {Array.from({ length: 4 }, (_, i) => {
                  const isFilled = i < pin.length;
                  const isActive = focused && i === activeIndex && activeIndex < 4;
                  const allFilled = focused && pin.length === 4;

                  return (
                    <div
                      key={i}
                      className={[
                        "relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-xl border-2 transition-all duration-[250ms] ease-out",
                        isFilled
                          ? "border-primary bg-primary/[0.06]"
                          : isActive
                            ? "border-primary/70 bg-primary/[0.03] scale-105 shadow-[0_0_0_5px_hsl(var(--primary)/0.08)]"
                            : "border-border/30 bg-muted/15",
                        allFilled && isFilled
                          ? "shadow-[0_0_0_3px_hsl(var(--primary)/0.06)]"
                          : "",
                      ].join(" ")}
                    >
                      {isFilled ? (
                        <div className="h-3 w-3 rounded-full bg-primary transition-transform duration-150 scale-100" />
                      ) : (
                        <div
                          className={[
                            "rounded-full transition-all duration-[250ms]",
                            isActive
                              ? "h-2.5 w-2.5 bg-primary/35 animate-pulse"
                              : "h-[7px] w-[7px] bg-border/25",
                          ].join(" ")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive text-center font-medium animate-fade-in">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-[2.875rem] text-sm font-semibold tracking-wide transition-all duration-150 active:scale-[0.98] shadow-[0_1px_3px_0_hsl(var(--primary)/0.15)]"
                disabled={loading || pin.length !== 4}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/40">
              <Lock className="h-3 w-3" />
              <span>Secure connection</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
