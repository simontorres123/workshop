import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { CreateClientRequest, ClientSearchFilters } from '@/types/client';

const clientRepository = RepositoryFactory.getClients();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ClientSearchFilters = {
      search: searchParams.get('search') || undefined,
      phone: searchParams.get('phone') || undefined,
      email: searchParams.get('email') || undefined,
      hasEmail: searchParams.get('hasEmail') ? searchParams.get('hasEmail') === 'true' : undefined,
      sortBy: (searchParams.get('sortBy') as 'fullName' | 'createdAt') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    const clients = await clientRepository.search(filters);
    
    return NextResponse.json({
      success: true,
      data: clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientData: CreateClientRequest = body;

    if (!clientData.fullName || !clientData.phone) {
      return NextResponse.json(
        { success: false, error: 'Nombre completo y teléfono son obligatorios' },
        { status: 400 }
      );
    }

    const existingClient = await clientRepository.findByPhone(clientData.phone);
    if (existingClient) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un cliente con este número de teléfono' },
        { status: 400 }
      );
    }

    if (clientData.email) {
      const emailClients = await clientRepository.getByEmail(clientData.email);
      if (emailClients.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un cliente con este email' },
          { status: 400 }
        );
      }
    }

    const client = await clientRepository.create(clientData);
    
    return NextResponse.json({
      success: true,
      data: client
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { success: false, error: 'Error creando cliente' },
      { status: 500 }
    );
  }
}