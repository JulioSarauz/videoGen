import { useEffect, useState } from "react";
import { getBalance, type OpenRouterBalance } from "../api";

export default function BalanceBanner({ refreshKey }: { refreshKey?: unknown }) {
  const [balance, setBalance] = useState<OpenRouterBalance | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getBalance()
      .then((b) => {
        setBalance(b);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [refreshKey]);

  if (failed) return <p className="quota-banner">No se pudo consultar el saldo de OpenRouter.</p>;
  if (!balance) return null;

  const usd = (n: number) => `$${n.toFixed(2)}`;
  const low = balance.remaining !== null && balance.remaining < 1;

  return (
    <p className={`quota-banner${low ? " quota-near" : ""}`}>
      {balance.remaining !== null
        ? `Saldo de OpenRouter: ${usd(balance.remaining)} disponibles`
        : "Saldo de OpenRouter: sin limite en esta key"}
      {` (consumido ${usd(balance.used)}${balance.total !== null ? ` de ${usd(balance.total)}` : ""}).`}
    </p>
  );
}
