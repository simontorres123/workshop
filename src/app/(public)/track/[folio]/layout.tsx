import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getAppUrl } from '@/lib/app-url';

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }): Promise<Metadata> {
  const { folio } = await params;
  const { data: order } = await supabaseAdmin.from('repair_orders').select('folio, organization_id, device_type, device_brand, device_model').ilike('folio', folio).maybeSingle();
  const { data: organization } = order?.organization_id
    ? await supabaseAdmin.from('organizations').select('name, logo_url').eq('id', order.organization_id).maybeSingle()
    : { data: null };
  const name = organization?.name || 'Workshop';
  const device = [order?.device_brand, order?.device_model, order?.device_type].filter(Boolean).join(' ');
  const title = order ? `Seguimiento ${order.folio} | ${name}` : `Seguimiento de reparación | ${name}`;
  const description = order ? `Consulta el estado de la reparación de tu ${device || 'aparato'}.` : 'Consulta el estado de tu reparación.';
  return {
    metadataBase: getAppUrl(),
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: organization?.logo_url ? [{ url: organization.logo_url, alt: `Logo de ${name}` }] : [{ url: '/brand/workshop-mark.png', alt: 'Workshop' }],
    },
    twitter: { card: 'summary', title, description, images: [organization?.logo_url || '/brand/workshop-mark.png'] },
  };
}

export default function TrackFolioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
