import { NextRequest, NextResponse } from 'next/server';
import { digitalSignatureService } from '@/services/digital-signature.service';

// POST /api/digital-signatures/compare - Comparar dos firmas digitales
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature1, signature2 } = body;

    if (!signature1 || !signature2) {
      return NextResponse.json(
        { success: false, error: 'Se requieren dos firmas para comparar' },
        { status: 400 }
      );
    }

    const comparison = await digitalSignatureService.compareSignatures(signature1, signature2);

    return NextResponse.json({
      success: true,
      data: comparison,
      message: `Similitud: ${(comparison.similarity * 100).toFixed(1)}% - Recomendación: ${comparison.recommendation}`
    });

  } catch (error) {
    console.error('Error comparing digital signatures:', error);
    return NextResponse.json(
      { success: false, error: 'Error comparando firmas digitales' },
      { status: 500 }
    );
  }
}