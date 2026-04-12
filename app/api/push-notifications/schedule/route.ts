import { NextRequest, NextResponse } from 'next/server';
import { 
  validateCreatePushNotification, 
  validateDeletePushNotification,
  handleValidationError,
  PushNotificationValidationError 
} from '@/schemas/push-notification.schema';
import { PushNotificationUtils, PUSH_NOTIFICATION_TYPES } from '@/types/push-notification';
import type { ScheduledPushNotification } from '@/types/push-notification';
import { PushNotificationService } from '@/lib/cosmos/push-notifications';
import { NotificationQueueService } from '@/services/queue.service';

// POST /api/push-notifications/schedule - Programar notificaciones automáticas
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Validar datos de entrada
    const validatedData = handleValidationError(validateCreatePushNotification(requestData));
    const { type, schedule, config } = validatedData;

    console.log('📅 Configurando notificación programada:', {
      type,
      schedule,
      config
    });

    // Verificar que el tipo de notificación sea válido
    if (!PUSH_NOTIFICATION_TYPES[type as keyof typeof PUSH_NOTIFICATION_TYPES]) {
      return NextResponse.json({
        success: false,
        error: 'Tipo de notificación no válido',
        availableTypes: Object.keys(PUSH_NOTIFICATION_TYPES)
      }, { status: 400 });
    }

    const notificationTypeConfig = PUSH_NOTIFICATION_TYPES[type as keyof typeof PUSH_NOTIFICATION_TYPES];

    // Procesar el horario personalizado si existe
    let parsedSchedule = notificationTypeConfig.defaultSchedule;
    
    if (schedule && config?.customTime) {
      // Es un horario personalizado
      parsedSchedule = {
        frequency: config.frequency === 'weekly' ? 'weekly' : 'daily',
        time: config.customTime,
        weekday: config.frequency === 'weekly' ? config.weekday : undefined
      };
      
      console.log('⏰ Horario personalizado configurado:', parsedSchedule);
    }
    
    // Crear la notificación programada usando los tipos tipados
    const scheduledNotification: ScheduledPushNotification = {
      id: PushNotificationUtils.generateNotificationId(type as any),
      type: type as any,
      title: notificationTypeConfig.displayName,
      description: notificationTypeConfig.description,
      schedule: parsedSchedule,
      config: {
        ...notificationTypeConfig.defaultConfig,
        ...config
      },
      template: notificationTypeConfig.template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: calculateNextRunFromSchedule(parsedSchedule),
      runCount: 0,
      failureCount: 0,
      isActive: true
    };

    // Guardar en Cosmos DB
    const savedNotification = await PushNotificationService.createScheduledNotification(scheduledNotification);
    
    console.log('✅ Notificación programada creada y guardada en DB:', savedNotification.id);

    // Simular la programación inmediata para demostración
    if (config?.testRun) {
      setTimeout(async () => {
        await sendScheduledNotification(scheduledNotification);
      }, 5000); // Enviar en 5 segundos para prueba
    }
    
    // Programar la notificación usando Azure Storage Queue
    await scheduleWithQueue(savedNotification);

    return NextResponse.json({
      success: true,
      message: 'Notificación programada exitosamente',
      data: savedNotification,
      availableTypes: PUSH_NOTIFICATION_TYPES
    });

  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    
    // Manejar errores de validación específicamente
    if (error instanceof PushNotificationValidationError) {
      return NextResponse.json({
        success: false,
        error: 'Error de validación',
        details: error.getErrorMessages()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Error programando notificación',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/push-notifications/schedule - Obtener notificaciones programadas
export async function GET() {
  try {
    console.log('📋 Obteniendo notificaciones programadas desde DB...');
    
    const notifications = await PushNotificationService.getAllScheduledNotifications();
    
    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('❌ Error obteniendo notificaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error consultando notificaciones',
      data: [],
      count: 0
    });
  }
}

// PUT /api/push-notifications/schedule - Actualizar notificación programada
export async function PUT(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { id, isActive } = requestData;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'ID de notificación requerido'
      }, { status: 400 });
    }

    console.log('🔄 Actualizando estado de notificación:', { id, isActive });

    // Buscar la notificación por ID
    const allNotifications = await PushNotificationService.getAllScheduledNotifications();
    const notificationToUpdate = allNotifications.find(n => n.id === id);
    
    if (!notificationToUpdate) {
      return NextResponse.json({
        success: false,
        error: 'Notificación no encontrada'
      }, { status: 404 });
    }

    // Actualizar el estado
    const updated = await PushNotificationService.updateScheduledNotification({
      id,
      type: notificationToUpdate.notificationType, // Usar notificationType para el método
      isActive
    });

    console.log('✅ Estado de notificación actualizado:', { id, isActive });

    return NextResponse.json({
      success: true,
      message: 'Estado de notificación actualizado',
      data: updated
    });

  } catch (error) {
    console.error('❌ Error actualizando estado de notificación:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error actualizando estado de notificación'
    }, { status: 500 });
  }
}

// DELETE /api/push-notifications/schedule - Cancelar notificación programada
export async function DELETE(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Validar datos de entrada
    const validatedData = handleValidationError(validateDeletePushNotification(requestData));
    const { id } = validatedData;

    console.log('🗑️ Cancelando notificación programada:', id);

    // Necesitamos el tipo para hacer la consulta en Cosmos DB
    // Como no lo tenemos en el request, vamos a hacer una búsqueda
    const allNotifications = await PushNotificationService.getAllScheduledNotifications();
    const notificationToDelete = allNotifications.find(n => n.id === id);
    
    if (!notificationToDelete) {
      return NextResponse.json({
        success: false,
        error: 'Notificación no encontrada'
      }, { status: 404 });
    }

    // Eliminar de la base de datos (soft delete)
    const deleted = await PushNotificationService.deleteScheduledNotification(id, notificationToDelete.type);
    
    if (deleted) {
      console.log('✅ Notificación eliminada exitosamente de DB:', id);
      return NextResponse.json({
        success: true,
        message: 'Notificación programada cancelada',
        deleted: 1
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Error eliminando notificación'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error canceling scheduled notification:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error cancelando notificación programada'
    }, { status: 500 });
  }
}

import { getNowInCST, createCSTDate, toCSTISOString, logWithCSTTime, MEXICO_TIMEZONE } from '@/utils/timezone';
import { DateTime } from 'luxon';

// Nueva función para calcular próxima ejecución desde el objeto schedule usando Luxon
function calculateNextRunFromSchedule(schedule: any): string {
  if (schedule && typeof schedule === 'object' && schedule.time) {
    const { frequency, time, weekday } = schedule;
    
    // Obtener fecha/hora actual en CST usando Luxon
    const nowCST = DateTime.now().setZone('America/Mexico_City');
    
    // Determinar si la hora ya pasó hoy
    const timeHasPassed = (time.hour < nowCST.hour) || 
                         (time.hour === nowCST.hour && time.minute <= nowCST.minute);
    
    let targetDateTime = nowCST.set({ 
      hour: time.hour, 
      minute: time.minute, 
      second: 0, 
      millisecond: 0 
    });
    
    if (frequency === 'daily') {
      // Si ya pasó la hora de hoy, usar mañana
      if (timeHasPassed) {
        targetDateTime = targetDateTime.plus({ days: 1 });
      }
    } else if (frequency === 'weekly' && weekday) {
      // Calcular el próximo día de la semana
      const currentWeekday = nowCST.weekday; // Luxon: 1=lunes, 7=domingo
      const targetWeekday = weekday === 7 ? 7 : weekday; // Mantener formato Luxon
      
      let daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;
      
      if (daysUntilTarget === 0 && timeHasPassed) {
        daysUntilTarget = 7; // Próxima semana si ya pasó la hora
      }
      
      if (daysUntilTarget > 0) {
        targetDateTime = targetDateTime.plus({ days: daysUntilTarget });
      }
    }
    
    // Convertir a formato string sin zona horaria (manteniendo CST)
    const resultTimeString = targetDateTime.toFormat('yyyy-MM-dd\'T\'HH:mm:00.000');
    
    // Log para debugging
    logWithCSTTime('🐛 Debug cálculo de fecha con Luxon:', {
      currentTimeUTC: DateTime.now().toISO(),
      currentTimeCST: nowCST.toISO(),
      currentCSTFormatted: nowCST.toFormat('yyyy-MM-dd HH:mm:ss'),
      selectedHour: time.hour,
      selectedMinute: time.minute,
      timeHasPassed,
      targetDateTime: targetDateTime.toISO(),
      targetFormatted: targetDateTime.toFormat('yyyy-MM-dd HH:mm:ss'),
      finalResult: resultTimeString
    });
    
    logWithCSTTime('📅 Próxima ejecución calculada con Luxon:', {
      frequency,
      selectedTime: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
      weekday,
      targetDate: targetDateTime.toFormat('yyyy-MM-dd'),
      finalTimeString: resultTimeString,
      note: 'Calculado usando Luxon DateTime'
    });
    
    return resultTimeString;
  }
  
  // Fallback a la función original si no es un objeto schedule
  return calculateNextRun('daily_9am');
}

// Función auxiliar para calcular próxima ejecución (legacy)
function calculateNextRun(schedule: string): string {
  const now = new Date();
  
  // Manejar horarios personalizados
  if (schedule.startsWith('custom_')) {
    const parts = schedule.split('_');
    
    if (parts[1] === 'daily') {
      // custom_daily_9h30m
      const timePart = parts[2];
      const hourMatch = timePart.match(/(\d+)h/);
      const minuteMatch = timePart.match(/(\d+)m/);
      const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      
      const nextRun = new Date(now);
      nextRun.setHours(hour, minute, 0, 0);
      
      // Si ya pasó la hora de hoy, programar para mañana
      if (nextRun <= now) {
        nextRun.setDate(now.getDate() + 1);
      }
      
      return nextRun.toISOString();
      
    } else if (parts[1] === 'weekly') {
      // custom_weekly_lunes_9h30m
      const weekdayName = parts[2];
      const timePart = parts[3];
      const hourMatch = timePart.match(/(\d+)h/);
      const minuteMatch = timePart.match(/(\d+)m/);
      const hour = hourMatch ? parseInt(hourMatch[1]) : 0;
      const minute = minuteMatch ? parseInt(minuteMatch[1]) : 0;
      
      // Mapear nombres de días a números
      const weekdayMap: Record<string, number> = {
        'lunes': 1, 'martes': 2, 'miércoles': 3, 'jueves': 4, 
        'viernes': 5, 'sábado': 6, 'domingo': 0
      };
      
      const targetWeekday = weekdayMap[weekdayName] || 1;
      const nextRun = new Date(now);
      const currentWeekday = now.getDay();
      
      // Calcular días hasta el próximo día objetivo
      let daysUntilTarget = (targetWeekday - currentWeekday + 7) % 7;
      if (daysUntilTarget === 0) {
        // Es el mismo día, verificar si ya pasó la hora
        nextRun.setHours(hour, minute, 0, 0);
        if (nextRun <= now) {
          daysUntilTarget = 7; // Programar para la próxima semana
        }
      }
      
      nextRun.setDate(now.getDate() + daysUntilTarget);
      nextRun.setHours(hour, minute, 0, 0);
      
      return nextRun.toISOString();
    }
  }
  
  // Horarios predefinidos existentes
  switch (schedule) {
    case 'daily_8am':
      const tomorrow8am = new Date(now);
      tomorrow8am.setDate(now.getDate() + 1);
      tomorrow8am.setHours(8, 0, 0, 0);
      return tomorrow8am.toISOString();
      
    case 'daily_9am':
      const tomorrow9am = new Date(now);
      tomorrow9am.setDate(now.getDate() + 1);
      tomorrow9am.setHours(9, 0, 0, 0);
      return tomorrow9am.toISOString();
      
    case 'daily_6pm':
      const today6pm = new Date(now);
      today6pm.setHours(18, 0, 0, 0);
      if (today6pm <= now) {
        today6pm.setDate(now.getDate() + 1);
      }
      return today6pm.toISOString();
      
    case 'weekly_monday_10am':
      const nextMonday = new Date(now);
      const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(10, 0, 0, 0);
      return nextMonday.toISOString();
      
    case 'weekly_friday_5pm':
      const nextFriday = new Date(now);
      const daysUntilFriday = (5 + 7 - now.getDay()) % 7 || 7;
      nextFriday.setDate(now.getDate() + daysUntilFriday);
      nextFriday.setHours(17, 0, 0, 0);
      return nextFriday.toISOString();
      
    default:
      // Por defecto, en 1 hora
      const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
      return inOneHour.toISOString();
  }
}

// Función para enviar notificación programada
async function sendScheduledNotification(notification: any) {
  console.log('🚀 Enviando notificación programada:', notification.type);
  
  try {
    // Generar contenido dinámico basado en el tipo
    let dynamicContent = await generateDynamicContent(notification.type);
    
    console.log('📱 Contenido dinámico generado:', dynamicContent);
    
    // Crear payload para la notificación automática
    const autoPayload = {
      type: notification.type,
      title: dynamicContent.title,
      body: dynamicContent.body,
      data: dynamicContent.data
    };
    
    console.log('📤 Enviando notificación automática:', autoPayload);
    
    // Usar el endpoint específico para notificaciones automáticas
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push-notifications/send-auto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(autoPayload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notificación automática enviada exitosamente:', result);
    } else {
      console.error('❌ Error enviando notificación automática:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error en sendScheduledNotification:', error);
  }
}

// Función para programar notificación real
async function scheduleRealNotification(notification: ScheduledPushNotification) {
  const now = new Date();
  const nextRunTime = new Date(notification.nextRun);
  const timeUntilExecution = nextRunTime.getTime() - now.getTime();
  
  console.log('⏰ Programando notificación real:', {
    id: notification.id,
    type: notification.type,
    nextRun: notification.nextRun,
    timeUntilExecution: `${Math.round(timeUntilExecution / 1000 / 60)} minutos`
  });
  
  // Solo programar si es en el futuro y no más de 24 horas
  if (timeUntilExecution > 0 && timeUntilExecution <= 24 * 60 * 60 * 1000) {
    setTimeout(async () => {
      console.log('🚀 Ejecutando notificación programada:', notification.id);
      
      // Verificar que la notificación sigue activa en DB
      const stillExists = await PushNotificationService.getScheduledNotificationById(notification.id, notification.type);
      if (stillExists && stillExists.isActive) {
        try {
          await sendScheduledNotification(notification);
          
          // Actualizar estadísticas en DB
          await PushNotificationService.incrementRunCount(notification.id, notification.type, true);
          
          // Calcular próxima ejecución si es recurrente
          if (notification.schedule.frequency === 'daily' || notification.schedule.frequency === 'weekly') {
            const nextRun = calculateNextRunFromSchedule(notification.schedule);
            await PushNotificationService.updateNextRun(notification.id, notification.type, nextRun);
            
            // Obtener la notificación actualizada y programar la siguiente ejecución
            const updatedNotification = await PushNotificationService.getScheduledNotificationById(notification.id, notification.type);
            if (updatedNotification) {
              scheduleRealNotification(updatedNotification);
            }
          }
        } catch (error) {
          console.error('❌ Error ejecutando notificación programada:', error);
          // Incrementar contador de fallos
          await PushNotificationService.incrementRunCount(notification.id, notification.type, false);
        }
      } else {
        console.log('⚠️ Notificación ya no existe o está inactiva:', notification.id);
      }
    }, timeUntilExecution);
    
    console.log('✅ Notificación programada para ejecutarse automáticamente');
  } else if (timeUntilExecution <= 0) {
    console.log('⚠️ La hora programada ya pasó, reprogramando para el siguiente ciclo');
    
    // Recalcular próxima ejecución
    const newNextRun = calculateNextRunFromSchedule(notification.schedule);
    await PushNotificationService.updateNextRun(notification.id, notification.type, newNextRun);
    
    // Obtener la notificación actualizada y reprogramar
    const updatedNotification = await PushNotificationService.getScheduledNotificationById(notification.id, notification.type);
    if (updatedNotification) {
      scheduleRealNotification(updatedNotification);
    }
  } else {
    console.log('⚠️ Notificación demasiado lejana, se programará dinámicamente');
  }
}

// Generar contenido dinámico basado en el tipo de notificación
async function generateDynamicContent(type: string) {
  switch (type) {
    case 'warranty_expiring':
      // En la implementación real, consultaría la base de datos
      return {
        title: '⚠️ Garantías por Vencer',
        body: 'Tienes 3 productos con garantía que vence en los próximos 7 días',
        data: { url: '/admin/inventory?filter=warranty_expiring' }
      };
      
    case 'low_stock':
      return {
        title: '📦 Stock Bajo Detectado',
        body: '5 productos tienen stock por debajo del mínimo',
        data: { url: '/admin/inventory?filter=low_stock' }
      };
      
    case 'pending_repairs':
      return {
        title: '🔧 Reparaciones Pendientes',
        body: 'Hay 2 reparaciones sin finalizar desde hace más de 3 días',
        data: { url: '/admin/repairs?status=pending' }
      };
      
    case 'daily_summary':
      return {
        title: '📊 Resumen del Día',
        body: 'Ayer: 5 ventas, 2 reparaciones completadas, $1,250 en ingresos',
        data: { url: '/admin/dashboard' }
      };
      
    case 'backup_reminder':
      return {
        title: '💾 Recordatorio: Backup',
        body: 'Es hora de hacer un respaldo de tus datos importantes',
        data: { url: '/admin/system' }
      };
      
    default:
      return {
        title: '🔔 Notificación del Sistema',
        body: 'Tienes actualizaciones pendientes en Workshop Pro',
        data: { url: '/admin/dashboard' }
      };
  }
}

// Función para programar notificación usando Azure Storage Queue
async function scheduleWithQueue(notification: ScheduledPushNotification) {
  try {
    console.log('📤 Programando notificación en Azure Queue:', {
      id: notification.id,
      type: notification.type,
      nextRun: notification.nextRun
    });

    // Inicializar el queue si es necesario
    await NotificationQueueService.initialize();

    // Usar directamente el string de nextRun que ya está en CST
    await NotificationQueueService.enqueueNotification(notification, notification.nextRun);
    
    console.log('✅ Notificación programada en Azure Queue exitosamente');
    
  } catch (error) {
    console.error('❌ Error programando notificación en queue:', error);
    // Fallback al método anterior si el queue falla
    console.log('🔄 Usando fallback con setTimeout...');
    await scheduleRealNotification(notification);
  }
}