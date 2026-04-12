import { BlobServiceClient, StorageSharedKeyCredential, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { AZURE_CONFIG, validateAzureConfig, getBlobUrl, generateBlobName } from '@/lib/azure/config';
import { ImageMetadata } from '@/types';

export interface UploadResult {
  success: boolean;
  data?: ImageMetadata;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

class BlobStorageService {
  private blobServiceClient: BlobServiceClient | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      if (!validateAzureConfig()) {
        console.warn('Azure Blob Storage configuration is incomplete');
        return;
      }

      // Opción 1: Usar connection string (recomendado para desarrollo)
      if (AZURE_CONFIG.STORAGE_CONNECTION_STRING) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
          AZURE_CONFIG.STORAGE_CONNECTION_STRING
        );
      }
      // Opción 2: Usar credenciales separadas
      else if (AZURE_CONFIG.STORAGE_ACCOUNT_NAME && AZURE_CONFIG.STORAGE_ACCOUNT_KEY) {
        const credential = new StorageSharedKeyCredential(
          AZURE_CONFIG.STORAGE_ACCOUNT_NAME,
          AZURE_CONFIG.STORAGE_ACCOUNT_KEY
        );
        
        this.blobServiceClient = new BlobServiceClient(
          `https://${AZURE_CONFIG.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          credential
        );
      }
    } catch (error) {
      console.error('Error initializing Azure Blob Storage client:', error);
    }
  }

  private async ensureContainerExists(containerName: string): Promise<ContainerClient | null> {
    if (!this.blobServiceClient) {
      console.error('BlobServiceClient is not initialized');
      return null;
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      
      // Crear contenedor si no existe
      const exists = await containerClient.exists();
      
      if (!exists) {
        await containerClient.create();
        // Container created successfully
      }
      
      return containerClient;
    } catch (error) {
      console.error(`Error ensuring container '${containerName}' exists:`, error);
      return null;
    }
  }

  async uploadImage(
    file: File,
    containerName: string = AZURE_CONFIG.CONTAINERS.REPAIR_IMAGES,
    folder?: string
  ): Promise<UploadResult> {
    try {
      if (!this.blobServiceClient) {
        return {
          success: false,
          error: 'Azure Blob Storage client not initialized'
        };
      }

      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const containerClient = await this.ensureContainerExists(containerName);
      if (!containerClient) {
        return {
          success: false,
          error: 'Failed to access container'
        };
      }

      // Generar nombre único para el blob
      const blobName = folder 
        ? `${folder}/${generateBlobName(file.name)}`
        : generateBlobName(file.name);

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Convertir File a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // Subir archivo con metadatos
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: file.type,
        },
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          size: file.size.toString(),
        }
      });

      // Crear objeto ImageMetadata
      const imageMetadata: ImageMetadata = {
        _id: uuidv4(),
        filename: blobName,
        originalName: file.name,
        url: await this.getImageUrl(blobName, containerName),
        blobName: blobName,
        containerName: containerName,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date()
      };

      return {
        success: true,
        data: imageMetadata
      };

    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async uploadMultipleImages(
    files: File[],
    containerName: string = AZURE_CONFIG.CONTAINERS.REPAIR_IMAGES,
    folder?: string
  ): Promise<{
    successful: ImageMetadata[];
    failed: Array<{ file: File; error: string }>;
  }> {
    const successful: ImageMetadata[] = [];
    const failed: Array<{ file: File; error: string }> = [];

    // Procesar archivos de forma paralela (máximo 3 a la vez para evitar sobrecarga)
    const batchSize = 3;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const promises = batch.map(async (file) => {
        const result = await this.uploadImage(file, containerName, folder);
        if (result.success && result.data) {
          successful.push(result.data);
        } else {
          failed.push({ file, error: result.error || 'Unknown error' });
        }
      });

      await Promise.all(promises);
    }

    return { successful, failed };
  }

  async deleteImage(blobName: string, containerName: string): Promise<DeleteResult> {
    try {
      // Attempting to delete blob
      
      if (!this.blobServiceClient) {
        return {
          success: false,
          error: 'Azure Blob Storage client not initialized'
        };
      }

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Verificar si el blob existe antes de intentar eliminarlo
      const exists = await blockBlobClient.exists();
      
      if (!exists) {
        return {
          success: false,
          error: `Blob not found: ${blobName}`
        };
      }

      await blockBlobClient.delete();
      // Blob deleted successfully

      return { success: true };

    } catch (error) {
      console.error(`❌ Error eliminando imagen "${blobName}":`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async deleteMultipleImages(
    blobNames: string[],
    containerName: string
  ): Promise<{
    successful: string[];
    failed: Array<{ blobName: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ blobName: string; error: string }> = [];

    const promises = blobNames.map(async (blobName) => {
      const result = await this.deleteImage(blobName, containerName);
      if (result.success) {
        successful.push(blobName);
      } else {
        failed.push({ blobName, error: result.error || 'Unknown error' });
      }
    });

    await Promise.all(promises);

    return { successful, failed };
  }

  private validateFile(file: File): { isValid: boolean; error?: string } {
    // Validar tamaño
    if (file.size > AZURE_CONFIG.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large. Maximum size is ${AZURE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // Validar tipo MIME
    if (!AZURE_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${AZURE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
      };
    }

    return { isValid: true };
  }

  async getImageUrl(blobName: string, containerName: string): Promise<string> {
    // Usar nuestro endpoint interno en lugar de la URL directa de Azure
    return `/api/images/${containerName}/${blobName}`;
  }

  async getImageStream(blobName: string, containerName: string): Promise<NodeJS.ReadableStream | null> {
    try {
      if (!this.blobServiceClient) {
        return null;
      }

      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const downloadResponse = await blockBlobClient.download();
      return downloadResponse.readableStreamBody || null;

    } catch (error) {
      console.error('Error getting image stream:', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return this.blobServiceClient !== null;
  }
}

// Exportar instancia singleton
export const blobStorageService = new BlobStorageService();
export default blobStorageService;