import crypto from 'crypto';

const getSecret = () => process.env.RECEIPT_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'workshop-dev-receipt-secret';

export function createSaleReceiptToken(saleId: string, organizationId: string) {
  const payload = Buffer.from(`${saleId}:${organizationId}`).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySaleReceiptToken(token: string) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const given = Buffer.from(signature);
  const valid = given.length === Buffer.byteLength(expected) && crypto.timingSafeEqual(given, Buffer.from(expected));
  if (!valid) return null;
  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 1) return null;
  return { saleId: decoded.slice(0, separator), organizationId: decoded.slice(separator + 1) };
}
