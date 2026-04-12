/**
 * Utilidades para manejo de timezone CST (Ciudad de México)
 */

export const MEXICO_TIMEZONE = 'America/Mexico_City';

/**
 * Obtiene la fecha actual en CST
 */
export function getNowInCST(): Date {
  const now = new Date();
  // Convertir a CST usando toLocaleString
  const cstString = now.toLocaleString("sv-SE", { timeZone: MEXICO_TIMEZONE });
  return new Date(cstString);
}

/**
 * Convierte cualquier fecha a CST
 */
export function convertToCST(date: Date): Date {
  const cstString = date.toLocaleString("sv-SE", { timeZone: MEXICO_TIMEZONE });
  return new Date(cstString);
}

/**
 * Crea una fecha en CST con hora específica
 */
export function createCSTDate(year: number, month: number, day: number, hour: number = 0, minute: number = 0): Date {
  // Crear fecha base en CST
  const date = new Date();
  date.setFullYear(year, month, day);
  date.setHours(hour, minute, 0, 0);
  
  // Convertir a CST
  return convertToCST(date);
}

/**
 * Obtiene el string ISO en CST (no UTC)
 */
export function toCSTISOString(date: Date): string {
  const cstDate = convertToCST(date);
  return cstDate.toISOString().replace('Z', ''); // Quitar la Z para indicar que no es UTC
}

/**
 * Parsea un string de fecha como CST
 */
export function parseFromCST(isoString: string): Date {
  // Si no tiene Z al final, asumimos que es CST
  if (!isoString.endsWith('Z')) {
    return new Date(isoString);
  }
  
  // Si tiene Z, convertir de UTC a CST
  const utcDate = new Date(isoString);
  return convertToCST(utcDate);
}

/**
 * Formatea una fecha para mostrar en CST
 */
export function formatCSTDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: MEXICO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return date.toLocaleString('es-MX', { ...defaultOptions, ...options });
}

/**
 * Log con timestamp en CST
 */
export function logWithCSTTime(message: string, data?: any): void {
  const timestamp = formatCSTDate(new Date());
  console.log(`[${timestamp} CST] ${message}`, data || '');
}