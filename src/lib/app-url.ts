/**
 * Dominio canónico de la aplicación.
 * Vercel expone VERCEL_PROJECT_PRODUCTION_URL incluso en previews, por lo que
 * los enlaces compartibles y las imágenes OG siempre apuntan a producción.
 */
export function getAppUrl(requestOrigin?: string): URL {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const deployment = process.env.VERCEL_URL?.trim();
  const value = configured || (production ? `https://${production}` : deployment ? `https://${deployment}` : requestOrigin || 'http://localhost:3000');
  return new URL(value.startsWith('http') ? value : `https://${value}`);
}
