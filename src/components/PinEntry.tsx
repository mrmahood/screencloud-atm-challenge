import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, Lock } from "lucide-react";

interface PinEntryProps {
  onSuccess: (balance: number) => void;
}

export default function PinEntry({ onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("https://pinapi.screencloudsolutions.com/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

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
          : err.message || "Something went wrong";
      setError(message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">ATM Login</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]*"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const numericPin = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(numericPin);
                setError(null);
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedValue = e.clipboardData.getData("text");
                const numericPin = pastedValue.replace(/\D/g, "").slice(0, 4);
                setPin(numericPin);
                setError(null);
              }}
              className={`text-center text-2xl tracking-[0.5em] h-14 ${shake ? "animate-shake" : ""}`}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-12 text-base" disabled={loading || pin.length !== 4}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
