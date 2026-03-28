import PinEntry from "@/components/PinEntry";
import AtmDashboard from "@/components/AtmDashboard";
import { useAtm } from "@/hooks/useAtm";

export default function Index() {
  const { balance, notes, transactions, error, setError, withdraw, login, reset } = useAtm();

  if (balance === null) {
    return <PinEntry onSuccess={login} />;
  }

  return (
    <AtmDashboard
      balance={balance}
      notes={notes}
      transactions={transactions}
      error={error}
      onWithdraw={withdraw}
      onSetError={setError}
      onReset={reset}
    />
  );
}
