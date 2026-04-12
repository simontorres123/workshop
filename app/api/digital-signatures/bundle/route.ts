import { NextRequest, NextResponse } from 'next/server';
import { digitalSignatureService } from '@/services/digital-signature.service';

// POST /api/digital-signatures/bundle - Crear bundle de firmas para un documento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signatures, documentContent, format = 'json' } = body;

    if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere al menos una firma' },
        { status: 400 }
      );
    }

    // Crear bundle de firmas
    const bundle = await digitalSignatureService.createSignatureBundle(signatures, documentContent);

    // Si se solicita formato de auditoría
    if (format === 'audit') {
      const auditLog = await digitalSignatureService.exportSignatureAuditLog(signatures);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json; charset=utf-8');
      headers.set('Content-Disposition', `attachment; filename="audit-log-${bundle.bundleId}.json"`);
      
      return new Response(auditLog, { headers });
    }

    return NextResponse.json({
      success: true,
      data: bundle,
      message: `Bundle creado con ${signatures.length} firmas`
    });

  } catch (error) {
    console.error('Error creating signature bundle:', error);
    return NextResponse.json(
      { success: false, error: 'Error creando bundle de firmas' },
      { status: 500 }
    );
  }
}