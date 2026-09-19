import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const balanceRouter = Router();

const headers = { Authorization: `Bearer ${env.openrouterApiKey}` };

// Saldo de la cuenta: /credits (total comprado y consumido). Si la key no tiene
// permiso para ese endpoint, cae al limite propio de la key en /key.
async function fetchBalance() {
  const credits = await fetch(`${env.openrouterBaseUrl}/credits`, { headers });
  if (credits.ok) {
    const { data } = (await credits.json()) as { data: { total_credits: number; total_usage: number } };
    return {
      total: data.total_credits,
      used: data.total_usage,
      remaining: data.total_credits - data.total_usage
    };
  }

  const key = await fetch(`${env.openrouterBaseUrl}/key`, { headers });
  if (!key.ok) throw new Error(`OpenRouter respondio ${key.status}`);
  const { data } = (await key.json()) as {
    data: { limit: number | null; limit_remaining: number | null; usage: number };
  };
  return {
    total: data.limit,
    used: data.usage,
    remaining: data.limit_remaining
  };
}

balanceRouter.get("/", requireAuth, async (_req, res) => {
  try {
    res.json(await fetchBalance());
  } catch (err) {
    console.error("Error consultando saldo de OpenRouter:", err);
    res.status(502).json({ error: "No se pudo consultar el saldo de OpenRouter." });
  }
});
