import { supabase } from '@/lib/supabase/client';

/**
 * Servicio de almacenamiento unificado utilizando Supabase Storage.
 * Reemplaza la implementación anterior de Azure Blob Storage.
 */
export const storageService = {
  /**
   * Sube una imagen a un bucket de Supabase
   */
  async uploadImage(bucketName: string, file: File, path: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Obtener la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return null;
    }
  },

  /**
   * Elimina una imagen del bucket
   */
  async deleteImage(bucketName: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return false;
    }
  },

  /**
   * Obtiene la URL de una imagen
   */
  getImageUrl(bucketName: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);
    
    return publicUrl;
  }
};
