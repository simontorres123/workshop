import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, service, recipient, message, subject } = body;

    if (action === 'test') {
      // Simular envío de mensaje de prueba
      console.log(`📨 Enviando mensaje de prueba via ${service}:`, {
        recipient,
        message,
        subject,
        timestamp: new Date().toISOString()
      });

      // Simular diferentes tipos de servicios
      const serviceConfig = {
        email: {
          name: 'Email (SMTP)',
          icon: '📧',
          delay: 1500
        },
        sms: {
          name: 'SMS (Twilio)',
          icon: '📱', 
          delay: 2000
        },
        whatsapp: {
          name: 'WhatsApp Business',
          icon: '💬',
          delay: 1000
        }
      };

      const config = serviceConfig[service as keyof typeof serviceConfig];
      
      if (!config) {
        return NextResponse.json({
          success: false,
          error: 'Servicio no soportado'
        }, { status: 400 });
      }

      // Simular delay del servicio
      await new Promise(resolve => setTimeout(resolve, config.delay));

      // Simular éxito/fallo (90% éxito)
      const isSuccess = Math.random() > 0.1;

      if (isSuccess) {
        return NextResponse.json({
          success: true,
          message: `Mensaje de prueba enviado exitosamente via ${config.name}`,
          data: {
            service,
            recipient,
            message,
            subject,
            sentAt: new Date().toISOString(),
            status: 'delivered',
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `Error simulado enviando via ${config.name}`,
          details: 'Error de conexión con el servicio externo'
        }, { status: 500 });
      }
    }

    // Para otras acciones futuras (configuración, etc.)
    return NextResponse.json({
      success: false,
      error: 'Acción no soportada'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in external notifications API:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { 
      status: 500 
    });
  }
}