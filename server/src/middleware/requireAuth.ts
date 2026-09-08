import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../services/auth.js";

const COOKIE_NAME = "genvideo_session";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "No autenticado." });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Sesion invalida o expirada." });
  }

  next();
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
