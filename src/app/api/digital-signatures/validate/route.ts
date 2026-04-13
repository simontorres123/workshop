import { NextRequest, NextResponse } from 'next/server';
import { digitalSignatureService } from '@/services/digital-signature.service';

// POST /api/digital-signatures/validate - Validar firma digital
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, expectedSigner, maxAgeHours, documentHash } = body;

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Firma digital es requerida' },
        { status: 400 }
      );
    }

    // Validación básica o verificación avanzada
    let result;
    
    if (expectedSigner || maxAgeHours || documentHash) {
      // Verificación avanzada
      result = await digitalSignatureService.verifySignature({
        signature,
        expectedSigner,
        maxAgeHours,
        documentHash
      });
    } else {
      // Validación básica
      result = await digitalSignatureService.validateSignature(signature);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.isValid ? 'Firma válida' : 'Firma inválida'
    });

  } catch (error) {
    console.error('Error validating digital signature:', error);
    return NextResponse.json(
      { success: false, error: 'Error validando firma digital' },
      { status: 500 }
    );
  }
}