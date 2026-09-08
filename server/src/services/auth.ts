import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function verifySharedPassword(password: string): boolean {
  return bcrypt.compareSync(password, env.authPasswordHash);
}

export function issueSessionToken(subject: string): string {
  return jwt.sign({ sub: subject }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  } as jwt.SignOptions);
}

export function verifySessionToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, env.jwtSecret) as { sub: string };
  } catch {
    return null;
  }
}
