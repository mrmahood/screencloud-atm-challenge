import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Loader2, Lock, ShieldCheck } from "lucide-react";

interface PinEntryProps {
  onSuccess: (balance: number) => void;
}

export default function PinEntry({ onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const hiddenRef = useRef<HTMLInputElement>(null);

  const sanitizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);
  const updatePin = (rawValue: string) => {
    setPin(sanitizePin(rawValue));
    setError(null);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      triggerShake();
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
      const message =
        err instanceof TypeError
          ? "Unable to connect. Please try again."
          : err.message || "Something went wrong.";
      setError(message);
      setPin("");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const dots = Array.from({ length: 4 }, (_, i) => i);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Secure Login
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Enter your 4-digit PIN
          </p>
        </div>

        <Card className="card-hero">
          <CardContent className="pt-7 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Visual dot indicators */}
              <div
                className={`flex items-center justify-center gap-3.5 py-3 ${shake ? "animate-shake" : ""}`}
                onClick={() => hiddenRef.current?.focus()}
                role="button"
                tabIndex={-1}
              >
                {dots.map((i) => (
                  <div
                    key={i}
                    className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                      pin.length > i
                        ? "bg-primary border-primary scale-110 shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                        : pin.length === i
                          ? "border-primary/50 bg-transparent"
                          : "border-border bg-transparent"
                    }`}
                  />
                ))}
              </div>

              {/* Hidden real input */}
              <input
                ref={hiddenRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]*"
                value={pin}
                onInput={(e) => updatePin(e.currentTarget.value)}
                onChange={(e) => updatePin(e.currentTarget.value)}
                onPaste={(e) => {
                  e.preventDefault();
                  updatePin(e.clipboardData.getData("text"));
                }}
                className="sr-only"
                autoFocus
                aria-label="PIN entry"
              />

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-lg bg-destructive/8 border border-destructive/20 px-3.5 py-2.5 text-sm font-medium text-destructive animate-slide-down">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150"
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

              {/* Security hint */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Lock className="h-3 w-3 text-muted-foreground/40" />
                <p className="text-[11px] text-muted-foreground/50">
                  Your PIN is encrypted and secure
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
