import { NextRequest, NextResponse } from 'next/server';
import { blobStorageService } from '@/services/blob-storage.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ container: string; path: string[] }> }
) {
  try {
    const { container, path } = await params;
    const blobName = path.join('/');

    if (!blobStorageService.isConfigured()) {
      return NextResponse.json(
        { error: 'Azure Blob Storage is not configured' },
        { status: 500 }
      );
    }

    // Obtener la imagen del blob storage
    const imageStream = await blobStorageService.getImageStream(blobName, container);
    
    if (!imageStream) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Convertir stream de Node.js a buffer
    const chunks: Buffer[] = [];
    
    return new Promise<NextResponse>((resolve, reject) => {
      imageStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      imageStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // Determinar content type basado en la extensión
        const extension = blobName.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            contentType = 'image/jpeg';
            break;
          case 'png':
            contentType = 'image/png';
            break;
          case 'webp':
            contentType = 'image/webp';
            break;
          case 'gif':
            contentType = 'image/gif';
            break;
        }

        resolve(new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000', // Cache por 1 año
          },
        }));
      });
      
      imageStream.on('error', (error) => {
        reject(error);
      });
    });

  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}