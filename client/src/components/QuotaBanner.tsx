import type { GeminiUsage } from "../api";

export default function QuotaBanner({ quota }: { quota: GeminiUsage | null }) {
  if (!quota) return null;

  const atLimit = quota.used >= quota.limit;
  const near = !atLimit && quota.used >= quota.limit - 3;

  return (
    <p className={`quota-banner${atLimit ? " quota-limit" : near ? " quota-near" : ""}`}>
      {atLimit
        ? `Llegaste al limite gratis diario de Gemini (${quota.used} de ${quota.limit}). Prueba de nuevo mañana o habilita facturacion en el proyecto.`
        : `Uso de Gemini hoy (plan gratis): ${quota.used} de ${quota.limit} solicitudes. Cada transcripcion o reduccion cuenta como 1.`}
    </p>
  );
}
