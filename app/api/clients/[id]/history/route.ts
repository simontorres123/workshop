import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';

const clientRepository = RepositoryFactory.getClients();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    const clientWithHistory = await clientRepository.findById(id);

    if (!clientWithHistory) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: clientWithHistory
    });
  } catch (error) {
    console.error('Error getting client history:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo historial del cliente' },
      { status: 500 }
    );
  }
}
