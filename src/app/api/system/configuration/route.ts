import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/auth/tenant-context';
import { supabaseAdmin } from '@/lib/supabase/client';

const DEFAULT_CONFIG = {
  storage: { costPerDay: 50, freeDays: 7, warningDays: 15, criticalDays: 3 },
  warranty: { defaultPeriodMonths: 3, warningDays: 30, criticalDays: 7 },
  notifications: { email: true, sms: false, whatsapp: true, inApp: true },
  business: { name: 'TechRepair Pro', phone: '555-REPAIR', email: 'info@techrepair.com', address: '', workingHours: '' },
  tax: { enabled: true, rate: 0.16, pricesIncludeTax: true }
};

async function readConfiguration(request: NextRequest) {
  const context = await getTenantContext(request);
  if (!context || !context.organizationId) return null;
  const { data, error } = await supabaseAdmin.from('organizations').select('settings').eq('id', context.organizationId).single();
  if (error) throw error;
  const stored = data?.settings && typeof data.settings === 'object' ? data.settings : {};
  return { context, config: { ...DEFAULT_CONFIG, ...stored, tax: { ...DEFAULT_CONFIG.tax, ...(stored as Record<string, any>).tax } } };
}

export async function GET(request: NextRequest) {
  try {
    const result = await readConfiguration(request);
    if (!result) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });

    return NextResponse.json({
      success: true,
      data: result.config
    });

  } catch (error) {
    console.error('Error fetching system configuration:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo configuración del sistema'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await readConfiguration(request);
    if (!result) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    if (!['org_admin', 'super_admin'].includes(result.context.role)) return NextResponse.json({ success: false, error: 'No tienes permisos para cambiar la configuración' }, { status: 403 });
    const newConfig = request.body ? await request.json() : {};
    const mergedConfig = { ...result.config, ...newConfig, tax: { ...result.config.tax, ...(newConfig.tax || {}) } };

    // Validar configuración
    const validationResult = validateConfiguration(mergedConfig);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: 'Configuración inválida',
        details: validationResult.errors
      }, { status: 400 });
    }

    // Actualizar configuración
    const { error } = await supabaseAdmin.from('organizations').update({ settings: mergedConfig, updated_at: new Date().toISOString() }).eq('id', result.context.organizationId);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: mergedConfig
    });

  } catch (error) {
    console.error('Error updating system configuration:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error actualizando configuración del sistema'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, section, data } = body;

    switch (action) {
      case 'reset_to_defaults':
        const result = await readConfiguration(request);
        if (!result) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        if (!['org_admin', 'super_admin'].includes(result.context.role)) return NextResponse.json({ success: false, error: 'No tienes permisos para cambiar la configuración' }, { status: 403 });
        await supabaseAdmin.from('organizations').update({ settings: DEFAULT_CONFIG, updated_at: new Date().toISOString() }).eq('id', result.context.organizationId);

        return NextResponse.json({
          success: true,
          message: 'Configuración restablecida a valores por defecto',
          data: DEFAULT_CONFIG
        });

      case 'update_section':
        // Actualizar solo una sección
        const sectionResult = await readConfiguration(request);
        if (!sectionResult) return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
        if (!['org_admin', 'super_admin'].includes(sectionResult.context.role)) return NextResponse.json({ success: false, error: 'No tienes permisos para cambiar la configuración' }, { status: 403 });
        const currentConfig = sectionResult.config;
        const updatedConfig = {
          ...currentConfig,
          [section]: {
            ...currentConfig[section],
            ...data
          }
        };

        await supabaseAdmin.from('organizations').update({ settings: updatedConfig, updated_at: new Date().toISOString() }).eq('id', sectionResult.context.organizationId);

        return NextResponse.json({
          success: true,
          message: `Sección ${section} actualizada exitosamente`,
          data: updatedConfig
        });

      case 'validate':
        // Validar configuración sin guardar
        const validation = validateConfiguration(data);

        return NextResponse.json({
          success: true,
          data: validation
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing configuration action:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error procesando acción de configuración'
    }, { status: 500 });
  }
}

/**
 * Valida la configuración del sistema
 */
function validateConfiguration(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar configuración de almacenamiento
  if (config.storage) {
    if (config.storage.costPerDay <= 0) {
      errors.push('El costo por día debe ser mayor a 0');
    }
    if (config.storage.freeDays < 0) {
      errors.push('Los días gratuitos no pueden ser negativos');
    }
    if (config.storage.warningDays <= config.storage.criticalDays) {
      errors.push('Los días de alerta deben ser mayores que los días críticos');
    }
  }

  // Validar configuración de garantía
  if (config.warranty) {
    if (config.warranty.defaultPeriodMonths <= 0) {
      errors.push('El período de garantía debe ser mayor a 0');
    }
    if (config.warranty.warningDays <= config.warranty.criticalDays) {
      errors.push('Los días de alerta de garantía deben ser mayores que los días críticos');
    }
  }

  // Validar información del negocio
  if (config.business) {
    if (!config.business.name || config.business.name.trim().length === 0) {
      errors.push('El nombre del negocio es requerido');
    }
    if (!config.business.phone || config.business.phone.trim().length === 0) {
      errors.push('El teléfono del negocio es requerido');
    }
    if (config.business.email && !isValidEmail(config.business.email)) {
      errors.push('El email del negocio no tiene un formato válido');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
