import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
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

/**
 * Servicio de almacenamiento de imágenes migrado a Supabase Storage.
 * Reemplaza la implementación anterior de Azure Blob Storage.
 */
class BlobStorageService {
  private readonly DEFAULT_BUCKET = 'repair-images';

  /**
   * Sube una imagen a Supabase Storage
   */
  async uploadImage(
    file: File,
    bucketName: string = this.DEFAULT_BUCKET,
    folder?: string
  ): Promise<UploadResult> {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Subir a Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      // Crear objeto ImageMetadata
      const imageMetadata: ImageMetadata = {
        _id: uuidv4(),
        filename: fileName,
        originalName: file.name,
        url: publicUrl,
        blobName: data.path, // Usamos la ruta de Supabase como blobName para compatibilidad
        containerName: bucketName,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date()
      };

      return {
        success: true,
        data: imageMetadata
      };

    } catch (error) {
      console.error('Error uploading image to Supabase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al subir imagen'
      };
    }
  }

  /**
   * Sube múltiples imágenes de forma paralela
   */
  async uploadMultipleImages(
    files: File[],
    bucketName: string = this.DEFAULT_BUCKET,
    folder?: string
  ): Promise<{
    successful: ImageMetadata[];
    failed: Array<{ file: File; error: string }>;
  }> {
    const successful: ImageMetadata[] = [];
    const failed: Array<{ file: File; error: string }> = [];

    const promises = files.map(async (file) => {
      const result = await this.uploadImage(file, bucketName, folder);
      if (result.success && result.data) {
        successful.push(result.data);
      } else {
        failed.push({ file, error: result.error || 'Error desconocido' });
      }
    });

    await Promise.all(promises);
    return { successful, failed };
  }

  /**
   * Elimina una imagen de Supabase Storage
   */
  async deleteImage(path: string, bucketName: string = this.DEFAULT_BUCKET): Promise<DeleteResult> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error(`Error eliminando imagen "${path}" de Supabase:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al eliminar imagen'
      };
    }
  }

  /**
   * Valida restricciones del archivo
   */
  private validateFile(file: File): { isValid: boolean; error?: string } {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > MAX_SIZE) {
      return { isValid: false, error: 'La imagen excede el límite de 5MB' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Formato de imagen no soportado (solo JPG, PNG, WEBP, GIF)' };
    }

    return { isValid: true };
  }

  /**
   * Verifica si el servicio está disponible (siempre true para Supabase)
   */
  isConfigured(): boolean {
    return true;
  }
}

export const blobStorageService = new BlobStorageService();
export default blobStorageService;
