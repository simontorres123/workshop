import { NextRequest, NextResponse } from 'next/server';
import { ClientRepository } from '@/repositories/client.repository';
import { UpdateClientRequest } from '@/types/client';

const clientRepository = new ClientRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    const client = includeHistory ? 
      await clientRepository.getWithHistory(id) : 
      await clientRepository.getById(id);

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error getting client:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo cliente' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateClientRequest = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de cliente requerido' },
        { status: 400 }
      );
    }

    if (body.phone) {
      const existingClient = await clientRepository.findByPhone(body.phone);
      if (existingClient && existingClient.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otro cliente con este teléfono' },
          { status: 400 }
        );
      }
    }

    if (body.email) {
      const existingClient = await clientRepository.findByEmail(body.email);
      if (existingClient && existingClient.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otro cliente con este email' },
          { status: 400 }
        );
      }
    }

    const client = await clientRepository.update(id, body);
    
    return NextResponse.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando cliente' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const success = await clientRepository.delete(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error eliminando cliente' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando cliente' },
      { status: 500 }
    );
  }
}