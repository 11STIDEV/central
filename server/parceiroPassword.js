import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const LOGIN_SIMPLES_RE = /^[a-z0-9_.-]{3,64}$/;
const EMAIL_LOGIN_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function normalizarLogin(login) {
  return String(login || "")
    .trim()
    .toLowerCase();
}

/**
 * Valida o formato de login do parceiro.
 * Aceita tanto identificadores simples (ex.: 'lanchonete', 'caixa_1', 'joao.silva')
 * quanto e-mails corporativos/pessoais (ex.: 'suporte@portalcci.com.br', 'cantina@gmail.com').
 */
export function loginValido(login) {
  const norm = normalizarLogin(login);
  if (!norm || norm.length < 3 || norm.length > 100) return false;
  return LOGIN_SIMPLES_RE.test(norm) || EMAIL_LOGIN_RE.test(norm);
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

/**
 * Retorna o e-mail de correspondência.
 * Se o login já for um e-mail válido, usa o próprio login.
 * Caso contrário, gera um e-mail sintético @parceiro.cci para compatibilidade.
 */
export function emailSinteticoParceiro(login) {
  const norm = normalizarLogin(login);
  if (norm.includes("@") && norm.includes(".")) {
    return norm;
  }
  return `${norm}@parceiro.cci`;
}
