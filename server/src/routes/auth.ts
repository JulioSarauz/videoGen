import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { issueSessionToken, verifySharedPassword } from "../services/auth.js";
import { SESSION_COOKIE_NAME, requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

const loginSchema = z.object({
  password: z.string().min(1)
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Password requerido." });
  }

  if (!verifySharedPassword(parsed.data.password)) {
    return res.status(401).json({ error: "Password incorrecto." });
  }

  const token = issueSessionToken("shared-user");
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 12
  });

  res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ ok: true });
});
