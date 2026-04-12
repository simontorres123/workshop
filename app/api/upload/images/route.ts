import { NextRequest, NextResponse } from 'next/server';
import { blobStorageService } from '@/services/blob-storage.service';
import { AZURE_CONFIG } from '@/lib/azure/config';

export async function POST(request: NextRequest) {
  try {
    // Verificar que el servicio esté configurado
    if (!blobStorageService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Azure Blob Storage is not properly configured' 
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const containerName = formData.get('container') as string || AZURE_CONFIG.CONTAINERS.REPAIR_IMAGES;
    const folder = formData.get('folder') as string || undefined;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No files provided' 
        },
        { status: 400 }
      );
    }

    // Validar que todos los elementos sean archivos válidos
    const validFiles = files.filter(file => file instanceof File && file.size > 0);
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid files provided' 
        },
        { status: 400 }
      );
    }

    // Subir archivos
    const result = await blobStorageService.uploadMultipleImages(
      validFiles,
      containerName,
      folder
    );

    // Respuesta con resultados detallados
    const response = {
      success: result.successful.length > 0,
      uploaded: result.successful.length,
      failed: result.failed.length,
      images: result.successful,
      errors: result.failed.map(f => ({
        filename: f.file.name,
        error: f.error
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!blobStorageService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Azure Blob Storage is not properly configured' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { blobNames, containerName } = body;

    if (!blobNames || !Array.isArray(blobNames) || blobNames.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No blob names provided' 
        },
        { status: 400 }
      );
    }

    if (!containerName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Container name is required' 
        },
        { status: 400 }
      );
    }

    // Eliminar archivos
    const result = await blobStorageService.deleteMultipleImages(blobNames, containerName);

    const response = {
      success: result.successful.length > 0,
      deleted: result.successful.length,
      failed: result.failed.length,
      errors: result.failed
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in delete API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}