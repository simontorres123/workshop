import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export type ChatbotRole = 'super_admin' | 'org_admin' | 'branch_admin' | 'technician';

export type ChatbotContext = {
  userId: string;
  organizationId: string;
  role: ChatbotRole;
  assignedBranches: string[];
};

function safeEquals(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getChatbotContext(request: NextRequest): Promise<ChatbotContext | null> {
  const configuredKey = process.env.WORKSHOP_CHATBOT_SERVICE_KEY || process.env.CHATBOT_API_KEY || '';
  const suppliedKey = request.headers.get('x-chatbot-key') || '';
  if (!configuredKey || !safeEquals(suppliedKey, configuredKey)) return null;

  const userId = request.headers.get('x-chatbot-user-id');
  const organizationId = request.headers.get('x-chatbot-organization-id');
  if (!userId || !organizationId) return null;

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, organization_id, role, user_branches(branch_id)')
    .eq('id', userId)
    .maybeSingle();
  if (error || !profile) return null;

  const role = profile.role as ChatbotRole;
  if (!['super_admin', 'org_admin', 'branch_admin', 'technician'].includes(role)) return null;
  if (role !== 'super_admin' && profile.organization_id !== organizationId) return null;

  const assignedBranches = ((profile as any).user_branches || []).map((item: any) => item.branch_id).filter(Boolean);
  return { userId, organizationId, role, assignedBranches };
}

export async function isChatbotSuperAdmin(request: NextRequest) {
  const configuredKey = process.env.WORKSHOP_CHATBOT_SERVICE_KEY || process.env.CHATBOT_API_KEY || '';
  const suppliedKey = request.headers.get('x-chatbot-key') || '';
  const userId = request.headers.get('x-chatbot-user-id');
  if (!configuredKey || !safeEquals(suppliedKey, configuredKey) || !userId) return false;
  const { data: profile } = await supabaseAdmin.from('user_profiles').select('role').eq('id', userId).maybeSingle();
  return profile?.role === 'super_admin';
}

export function canReadBranch(context: ChatbotContext, branchId: string | null) {
  if (context.role === 'super_admin' || context.role === 'org_admin') return true;
  return Boolean(branchId && context.assignedBranches.includes(branchId));
}
