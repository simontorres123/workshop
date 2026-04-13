import { NextRequest, NextResponse } from 'next/server';
import { blobStorageService } from '@/services/blob-storage.service';

const DEFAULT_BUCKET = 'repair-images';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const bucketName = (formData.get('container') as string) || (formData.get('bucket') as string) || DEFAULT_BUCKET;
    const folder = formData.get('folder') as string || undefined;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron archivos' },
        { status: 400 }
      );
    }

    const validFiles = files.filter(file => file instanceof File && file.size > 0);
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron archivos válidos' },
        { status: 400 }
      );
    }

    // Subir a Supabase Storage
    const result = await blobStorageService.uploadMultipleImages(
      validFiles,
      bucketName,
      folder
    );

    return NextResponse.json({
      success: result.successful.length > 0,
      uploaded: result.successful.length,
      failed: result.failed.length,
      images: result.successful,
      errors: result.failed.map(f => ({
        filename: f.file.name,
        error: f.error
      }))
    });

  } catch (error) {
    console.error('Error in upload API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { paths, bucketName = DEFAULT_BUCKET } = body;

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron rutas de archivos' },
        { status: 400 }
      );
    }

    // Eliminar de Supabase Storage
    const results = await Promise.all(
      paths.map(path => blobStorageService.deleteImage(path, bucketName))
    );

    const successful = results.filter(r => r.success).length;

    return NextResponse.json({
      success: successful > 0,
      deleted: successful,
      failed: results.length - successful
    });

  } catch (error) {
    console.error('Error in delete API:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
