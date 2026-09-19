import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';

export async function POST(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

  const chatbotUrl = process.env.CHATBOT_SERVICE_URL || process.env.CHATBOT_PUBLIC_URL;
  const serviceKey = process.env.CHATBOT_SERVICE_KEY || process.env.CHATBOT_API_KEY;
  if (!chatbotUrl || !serviceKey) return NextResponse.json({ success: false, error: 'Chatbot no configurado' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== 'string' || body.message.trim().length < 1 || body.message.length > 2000) {
    return NextResponse.json({ success: false, error: 'La pregunta no es válida' }, { status: 400 });
  }

  const response = await fetch(`${chatbotUrl.replace(/\/$/, '')}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Chatbot-Key': serviceKey,
      'X-Chatbot-User-Id': context.userId || '',
      'X-Chatbot-Organization-Id': context.organizationId,
      'X-Chatbot-Role': context.role || 'technician',
      'X-Chatbot-Branch-Ids': (context.assignedBranches || []).join(','),
    },
    body: JSON.stringify({
      message: body.message.trim(),
      organization_id: context.organizationId,
      user_id: context.userId || undefined,
      role: context.role,
      branch_ids: context.assignedBranches || [],
      session_id: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 100) : undefined,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = await response.json().catch(() => ({ success: false, error: 'Respuesta inválida del chatbot' }));
  return NextResponse.json(payload, { status: response.status });
}
