import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const LOGIN_RE = /^[a-z0-9_-]{3,32}$/;

export function normalizarLogin(login) {
  return String(login || "")
    .trim()
    .toLowerCase();
}

export function loginValido(login) {
  return LOGIN_RE.test(normalizarLogin(login));
}

export async function hashSenha(senha) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(String(senha), salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verificarSenha(senha, hashArmazenado) {
  if (!hashArmazenado || !String(senha)) return false;
  const parts = String(hashArmazenado).split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  try {
    const derived = await scryptAsync(String(senha), salt, 64);
    const keyBuf = Buffer.from(keyHex, "hex");
    if (keyBuf.length !== derived.length) return false;
    return timingSafeEqual(keyBuf, derived);
  } catch {
    return false;
  }
}

/** E-mail sintético para compatibilidade com PK (loja_id, email) existente. */
export function emailSinteticoParceiro(login) {
  return `${normalizarLogin(login)}@parceiro.cci`;
}
