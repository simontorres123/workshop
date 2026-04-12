import { useState } from 'react';
import { ImageMetadata } from '@/types';

interface UploadResponse {
  success: boolean;
  uploaded: number;
  failed: number;
  images: ImageMetadata[];
  errors: Array<{
    filename: string;
    error: string;
  }>;
}

interface DeleteResponse {
  success: boolean;
  deleted: number;
  failed: number;
  errors: Array<{
    blobName: string;
    error: string;
  }>;
}

export interface UseBlobStorageResult {
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  uploadImages: (
    files: File[],
    container?: string,
    folder?: string
  ) => Promise<ImageMetadata[]>;
  deleteImages: (
    blobNames: string[],
    containerName: string
  ) => Promise<boolean>;
  clearError: () => void;
}

export function useBlobStorage(): UseBlobStorageResult {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImages = async (
    files: File[],
    container = 'repair-images',
    folder?: string
  ): Promise<ImageMetadata[]> => {
    if (files.length === 0) {
      throw new Error('No files provided');
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Agregar archivos
      files.forEach(file => {
        formData.append('images', file);
      });
      
      // Agregar metadatos
      formData.append('container', container);
      if (folder) {
        formData.append('folder', folder);
      }

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: UploadResponse = await response.json();

      if (!result.success && result.uploaded === 0) {
        throw new Error(result.errors?.[0]?.error || 'Upload failed');
      }

      // Si hay errores parciales, mostrar advertencia pero continuar
      if (result.failed > 0) {
        console.warn('Some files failed to upload:', result.errors);
        setError(`${result.failed} archivos no se pudieron subir`);
      }

      return result.images;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error uploading images';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const deleteImages = async (
    blobNames: string[],
    containerName: string
  ): Promise<boolean> => {
    if (blobNames.length === 0) {
      return true;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/upload/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobNames,
          containerName
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DeleteResponse = await response.json();

      if (!result.success) {
        throw new Error('Delete failed');
      }

      // Si hay errores parciales, mostrar advertencia
      if (result.failed > 0) {
        console.warn('Some files failed to delete:', result.errors);
        setError(`${result.failed} archivos no se pudieron eliminar`);
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting images';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    uploading,
    deleting,
    error,
    uploadImages,
    deleteImages,
    clearError
  };
}