import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const branchRepo = RepositoryFactory.getBranches();
    const branches = await branchRepo.findAll();

    return NextResponse.json({ success: true, data: branches });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const branchRepo = RepositoryFactory.getBranches();
    
    const newBranch = await branchRepo.create(body);
    
    return NextResponse.json({ success: true, data: newBranch }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error creando sucursal' }, { status: 500 });
  }
}
