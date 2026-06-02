import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── CSS class merging ────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Formats a number as Brazilian Real currency.
 * e.g. 1234.56 → "R$ 1.234,56"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Formats an ISO date string as DD/MM/YYYY.
 * e.g. "2024-03-15" → "15/03/2024"
 */
export function formatDate(date: string): string {
  try {
    const parsed = date.includes("T") ? parseISO(date) : parseISO(date + "T00:00:00");
    return format(parsed, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

/**
 * Formats an ISO date string with time as DD/MM/YYYY HH:mm.
 */
export function formatDateTime(date: string): string {
  try {
    return format(parseISO(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return date;
  }
}

// ─── Document formatting ──────────────────────────────────────────────────────

/**
 * Formats a raw CNPJ string (digits only) as XX.XXX.XXX/XXXX-XX.
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

/**
 * Formats a raw CPF string (digits only) as XXX.XXX.XXX-XX.
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Formats a CNPJ or CPF based on digit length.
 */
export function formatDocument(doc: string): string {
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 14) return formatCNPJ(digits);
  if (digits.length === 11) return formatCPF(digits);
  return doc;
}

// ─── Number generators ────────────────────────────────────────────────────────

/**
 * Generates a contract number like "CONT-0001".
 * @param count - the sequential count (1-based)
 */
export function generateContractNumber(count: number): string {
  return `CONT-${String(count).padStart(4, "0")}`;
}

/**
 * Generates a service order number like "OS-0001".
 * @param count - the sequential count (1-based)
 */
export function generateOSNumber(count: number): string {
  return `OS-${String(count).padStart(4, "0")}`;
}

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Formats a phone number string.
 * Handles 11-digit mobile (XX) XXXXX-XXXX and 10-digit landline (XX) XXXX-XXXX.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

// ─── CEP ──────────────────────────────────────────────────────────────────────

/**
 * Formats a raw CEP string as XXXXX-XXX.
 */
export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return cep;
  return digits.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}
