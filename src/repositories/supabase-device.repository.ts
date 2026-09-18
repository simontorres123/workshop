import { supabase } from '@/lib/supabase/client';
import { ClientDevice, DeviceCatalogEntry } from '@/types/device';

export class SupabaseDeviceRepository {
  async listCatalog(organizationId: string): Promise<DeviceCatalogEntry[]> {
    const { data, error } = await supabase.from('device_catalog' as any)
      .select('id, device_type, brand, model, is_active')
      .eq('is_active', true)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('device_type').order('brand');
    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({ id: row.id, deviceType: row.device_type, brand: row.brand, model: row.model || undefined, isActive: row.is_active }));
  }

  async listClientDevices(clientId: string, organizationId: string): Promise<ClientDevice[]> {
    const { data, error } = await supabase.from('client_devices' as any).select('id, client_id, device_type, brand, model, serial, nickname, created_at, updated_at').eq('client_id', clientId).eq('organization_id', organizationId).order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({ id: row.id, clientId: row.client_id, deviceType: row.device_type, brand: row.brand, model: row.model || undefined, serial: row.serial || undefined, nickname: row.nickname || undefined, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at) }));
  }

  async upsertClientDevice(input: Omit<ClientDevice, 'id' | 'createdAt' | 'updatedAt'>, organizationId: string) {
    const { data: client, error: clientError } = await supabase.from('clients' as any)
      .select('id').eq('id', input.clientId).eq('organization_id', organizationId).maybeSingle();
    if (clientError) throw clientError;
    if (!client) throw new Error('El cliente no pertenece a la organización actual');

    let lookup = supabase.from('client_devices' as any).select('id').eq('organization_id', organizationId).eq('client_id', input.clientId).eq('device_type', input.deviceType).eq('brand', input.brand);
    lookup = input.model ? lookup.eq('model', input.model) : lookup.is('model', null);
    lookup = input.serial ? lookup.eq('serial', input.serial) : lookup.is('serial', null);
    const { data: existing, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) throw lookupError;
    const payload = { organization_id: organizationId, client_id: input.clientId, device_type: input.deviceType, brand: input.brand, model: input.model || null, serial: input.serial || null, nickname: input.nickname || null };
    const query = existing?.id
      ? supabase.from('client_devices' as any).update(payload).eq('id', existing.id)
      : supabase.from('client_devices' as any).insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as any;
  }
}
