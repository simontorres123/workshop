import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfiguration, updateSystemConfiguration } from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const config = await getSystemConfiguration();

    return NextResponse.json({
      success: true,
      data: config
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
    const newConfig = await request.json();

    // Validar configuración
    const validationResult = validateConfiguration(newConfig);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: 'Configuración inválida',
        details: validationResult.errors
      }, { status: 400 });
    }

    // Actualizar configuración
    const result = await updateSystemConfiguration(newConfig);

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: result
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
        // Restablecer configuración por defecto
        const defaultConfig = {
          storage: {
            costPerDay: 50,
            freeDays: 7,
            warningDays: 15,
            criticalDays: 3
          },
          warranty: {
            defaultPeriodMonths: 3,
            warningDays: 30,
            criticalDays: 7
          },
          notifications: {
            email: true,
            sms: false,
            whatsapp: true,
            inApp: true
          },
          business: {
            name: 'TechRepair Pro',
            phone: '555-REPAIR',
            email: 'info@techrepair.com',
            address: 'Av. Reparaciones 123, Ciudad',
            workingHours: 'Lun-Vie 9:00-18:00, Sáb 9:00-14:00'
          }
        };

        await updateSystemConfiguration(defaultConfig);

        return NextResponse.json({
          success: true,
          message: 'Configuración restablecida a valores por defecto',
          data: defaultConfig
        });

      case 'update_section':
        // Actualizar solo una sección
        const currentConfig = await getSystemConfiguration();
        const updatedConfig = {
          ...currentConfig,
          [section]: {
            ...currentConfig[section],
            ...data
          }
        };

        await updateSystemConfiguration(updatedConfig);

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