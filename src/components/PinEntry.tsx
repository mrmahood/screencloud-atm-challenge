import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";

interface PinEntryProps {
  onSuccess: (balance: number) => void;
}

export default function PinEntry({ onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sanitizePin = (value: string) => value.replace(/\D/g, "").slice(0, 4);

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
      setError(err.message || "Something went wrong");
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
                setPin(sanitizePin(e.target.value));
                setError(null);
              }}
              onBeforeInput={(e) => {
                const nativeEvent = e.nativeEvent as InputEvent;
                const isInsertAction = nativeEvent.inputType?.startsWith("insert");
                const nextChar = nativeEvent.data ?? "";

                if (!isInsertAction) {
                  return;
                }

                if (/\D/.test(nextChar) || pin.length >= 4) {
                  e.preventDefault();
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const pastedValue = e.clipboardData.getData("text");
                setPin(sanitizePin(pastedValue));
                setError(null);
              }}
              className="text-center text-2xl tracking-[0.5em] h-14"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
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
