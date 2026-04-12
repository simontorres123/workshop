import { NextRequest, NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/cosmos/push-notifications';
import { PushNotificationType } from '@/types/push-notification';

// POST /api/push-notifications/test - Probar sistema completo
export async function POST(request: NextRequest) {
  const testResults: any[] = [];
  let allPassed = true;

  try {
    console.log('🧪 Iniciando pruebas del sistema de notificaciones push...');
    
    // Prueba 1: Verificar variables de entorno
    testResults.push(await testEnvironmentVariables());
    
    // Prueba 2: Verificar contenedor existente
    testResults.push(await testContainerAccess());
    
    // Prueba 3: Crear una notificación de prueba
    testResults.push(await testCreateNotification());
    
    // Prueba 4: Leer notificaciones
    testResults.push(await testReadNotifications());
    
    // Prueba 5: Actualizar notificación
    testResults.push(await testUpdateNotification());
    
    // Prueba 6: Obtener estadísticas
    testResults.push(await testGetStats());
    
    // Verificar si todas las pruebas pasaron
    allPassed = testResults.every(result => result.passed);
    
    console.log(`🧪 Pruebas completadas: ${testResults.filter(r => r.passed).length}/${testResults.length} exitosas`);
    
    return NextResponse.json({
      success: allPassed,
      message: allPassed ? 'Todas las pruebas pasaron exitosamente' : 'Algunas pruebas fallaron',
      results: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.passed).length,
        failed: testResults.filter(r => !r.passed).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error durante las pruebas del sistema',
      error: error instanceof Error ? error.message : 'Unknown error',
      results: testResults,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Prueba 1: Variables de entorno
async function testEnvironmentVariables() {
  const test = {
    name: 'Variables de Entorno',
    description: 'Verificar que las variables de Cosmos DB estén configuradas',
    passed: false,
    details: {} as any
  };
  
  try {
    const endpoint = process.env.COSMOS_DB_ENDPOINT;
    const key = process.env.COSMOS_DB_KEY;
    const database = process.env.COSMOS_DB_DATABASE_NAME;
    
    test.details = {
      endpoint: endpoint ? `${endpoint.substring(0, 30)}...` : 'NO CONFIGURADO',
      key: key ? 'CONFIGURADO' : 'NO CONFIGURADO',
      database: database || 'NO CONFIGURADO'
    };
    
    test.passed = !!(endpoint && key && database);
    
    if (test.passed) {
      console.log('✅ Variables de entorno configuradas correctamente');
    } else {
      console.log('❌ Variables de entorno faltantes');
    }
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error verificando variables de entorno:', error);
  }
  
  return test;
}

// Prueba 2: Acceso al contenedor existente
async function testContainerAccess() {
  const test = {
    name: 'Acceso al Contenedor Documents',
    description: 'Verificar que se puede acceder al contenedor documents existente',
    passed: false,
    details: {} as any
  };
  
  try {
    // Intentar hacer una consulta simple para verificar acceso
    await PushNotificationService.getAllScheduledNotifications();
    test.passed = true;
    test.details.message = 'Acceso al contenedor documents exitoso';
    console.log('✅ Acceso al contenedor documents exitoso');
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error accediendo al contenedor documents:', error);
  }
  
  return test;
}

// Prueba 3: Crear notificación
async function testCreateNotification() {
  const test = {
    name: 'Crear Notificación',
    description: 'Crear una notificación de prueba en la base de datos',
    passed: false,
    details: {} as any
  };
  
  try {
    const testNotification = {
      id: `test_notification_${Date.now()}`,
      type: PushNotificationType.BACKUP_REMINDER,
      title: 'Prueba de Sistema',
      description: 'Notificación de prueba para verificar el sistema',
      schedule: {
        frequency: 'daily' as const,
        time: { hour: 10, minute: 0 }
      },
      config: {
        enabled: true,
        sound: 'default' as const,
        priority: 'normal' as const,
        requireInteraction: false,
        stackNotifications: false
      },
      template: {
        title: '🧪 Prueba del Sistema',
        body: 'Esta es una notificación de prueba del sistema',
        icon: '/favicon.ico',
        data: { url: '/admin/dashboard' }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nextRun: new Date(Date.now() + 60000).toISOString(), // En 1 minuto
      runCount: 0,
      failureCount: 0,
      isActive: true
    };
    
    const created = await PushNotificationService.createScheduledNotification(testNotification);
    
    test.passed = !!(created && created.id);
    test.details = {
      createdId: created?.id,
      createdType: created?.type,
      message: 'Notificación creada exitosamente'
    };
    
    console.log('✅ Notificación de prueba creada:', created?.id);
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creando notificación de prueba:', error);
  }
  
  return test;
}

// Prueba 4: Leer notificaciones
async function testReadNotifications() {
  const test = {
    name: 'Leer Notificaciones',
    description: 'Consultar todas las notificaciones desde la base de datos',
    passed: false,
    details: {} as any
  };
  
  try {
    const notifications = await PushNotificationService.getAllScheduledNotifications();
    
    test.passed = Array.isArray(notifications);
    test.details = {
      totalFound: notifications.length,
      message: `Se encontraron ${notifications.length} notificaciones`,
      sampleIds: notifications.slice(0, 3).map(n => n.id)
    };
    
    console.log(`✅ Se consultaron ${notifications.length} notificaciones`);
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error consultando notificaciones:', error);
  }
  
  return test;
}

// Prueba 5: Actualizar notificación
async function testUpdateNotification() {
  const test = {
    name: 'Actualizar Notificación',
    description: 'Actualizar una notificación existente',
    passed: false,
    details: {} as any
  };
  
  try {
    // Obtener la primera notificación para actualizar
    const notifications = await PushNotificationService.getAllScheduledNotifications();
    
    if (notifications.length === 0) {
      test.details.message = 'No hay notificaciones para actualizar';
      test.passed = true; // No es un error, simplemente no hay datos
      return test;
    }
    
    const firstNotification = notifications[0];
    
    // Incrementar el contador de ejecuciones
    await PushNotificationService.incrementRunCount(firstNotification.id, firstNotification.type, true);
    
    // Verificar que se actualizó
    const updated = await PushNotificationService.getScheduledNotificationById(firstNotification.id, firstNotification.type);
    
    test.passed = updated && updated.runCount > firstNotification.runCount;
    test.details = {
      notificationId: firstNotification.id,
      previousRunCount: firstNotification.runCount,
      newRunCount: updated?.runCount,
      message: 'Contador de ejecuciones actualizado'
    };
    
    console.log(`✅ Notificación actualizada: ${firstNotification.id}`);
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error actualizando notificación:', error);
  }
  
  return test;
}

// Prueba 6: Obtener estadísticas
async function testGetStats() {
  const test = {
    name: 'Estadísticas',
    description: 'Obtener estadísticas del sistema de notificaciones',
    passed: false,
    details: {} as any
  };
  
  try {
    const stats = await PushNotificationService.getNotificationStats();
    
    test.passed = typeof stats === 'object';
    test.details = {
      statsFound: Object.keys(stats).length,
      stats: stats,
      message: 'Estadísticas obtenidas exitosamente'
    };
    
    console.log('✅ Estadísticas obtenidas:', Object.keys(stats));
    
  } catch (error) {
    test.details.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error obteniendo estadísticas:', error);
  }
  
  return test;
}

// GET /api/push-notifications/test - Obtener estado de las pruebas
export async function GET() {
  try {
    const notifications = await PushNotificationService.getAllScheduledNotifications();
    const stats = await PushNotificationService.getNotificationStats();
    
    return NextResponse.json({
      success: true,
      message: 'Estado actual del sistema',
      data: {
        totalNotifications: notifications.length,
        stats,
        sampleNotifications: notifications.slice(0, 3).map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          nextRun: n.nextRun,
          runCount: n.runCount,
          isActive: n.isActive
        })),
        systemHealth: 'OK'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error obteniendo estado del sistema',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}