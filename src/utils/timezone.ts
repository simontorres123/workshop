import { DateTime } from 'luxon';

// Usar la variable de entorno personalizada o fallback a CDMX
const DEFAULT_ZONE = process.env.APP_TIMEZONE || process.env.NEXT_PUBLIC_TIMEZONE || 'America/Mexico_City';

/**
 * Obtiene la fecha y hora actual en la zona horaria configurada (CDMX)
 */
export const nowCST = () => {
  return DateTime.now().setZone(DEFAULT_ZONE);
};

/**
 * Formatea una fecha de la base de datos a formato legible en CDMX
 */
export const formatDateCST = (date: string | Date | null, format = 'dd/MM/yyyy HH:mm') => {
  if (!date) return 'N/A';
  
  const dt = typeof date === 'string' 
    ? DateTime.fromISO(date).setZone(DEFAULT_ZONE)
    : DateTime.fromJSDate(date).setZone(DEFAULT_ZONE);
    
  return dt.toFormat(format);
};

/**
 * Convierte una fecha local a un string ISO para guardar en Supabase (UTC)
 */
export const toUTC = (date: string | Date) => {
  const dt = typeof date === 'string'
    ? DateTime.fromISO(date, { zone: DEFAULT_ZONE })
    : DateTime.fromJSDate(date).setZone(DEFAULT_ZONE);
    
  return dt.toUTC().toISO();
};

/**
 * Log con timestamp en CDMX para debug en el servidor (Vercel logs)
 */
export const logWithCSTTime = (message: string, data?: any) => {
  const timestamp = nowCST().toFormat('yyyy-LL-dd HH:mm:ss');
  if (data) {
    console.log(`[${timestamp} CDMX] ${message}`, data);
  } else {
    console.log(`[${timestamp} CDMX] ${message}`);
  }
};
