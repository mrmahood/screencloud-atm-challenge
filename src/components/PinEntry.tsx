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
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Secure Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your 4-digit PIN</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-8 pb-8 px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                className={`flex justify-center gap-4 cursor-text ${shake ? "animate-shake" : ""}`}
                onClick={focusInput}
                role="presentation"
              >
                {Array.from({ length: 4 }, (_, i) => {
                  const isFilled = i < pin.length;
                  const isActive = focused && i === activeIndex && activeIndex < 4;
                  const isCompleted = focused && pin.length === 4;

                  return (
                    <div
                      key={i}
                      className={[
                        "relative flex h-14 w-14 items-center justify-center rounded-xl border-2 transition-all duration-200",
                        isFilled
                          ? "border-primary bg-primary/5"
                          : isActive
                            ? "border-primary/60 bg-primary/[0.03] shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                            : "border-border/60 bg-muted/30",
                        isCompleted && isFilled
                          ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                          : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "rounded-full transition-all duration-200",
                          isFilled
                            ? "h-3 w-3 bg-primary"
                            : "h-2 w-2 bg-border/50",
                          isActive && !isFilled
                            ? "animate-pulse"
                            : "",
                        ].join(" ")}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive text-center font-medium animate-slide-down">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold transition-all duration-200"
                disabled={loading || pin.length !== 4}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  "Enter"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
              <Lock className="h-3 w-3" />
              <span>Secure connection</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
