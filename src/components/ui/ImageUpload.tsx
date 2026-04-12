"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Alert,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useBlobStorage } from '@/hooks/useBlobStorage';
import { ImageMetadata } from '@/types';

interface ImagePreview {
  file: File;
  url: string;
  id: string;
}

interface Props {
  onImagesChange: (images: ImageMetadata[]) => void;
  maxImages?: number;
  maxSizeInMB?: number;
  acceptedTypes?: string[];
  initialImages?: ImageMetadata[]; // Imágenes existentes
  container?: string; // Contenedor de Azure
  folder?: string; // Carpeta dentro del contenedor
  autoUpload?: boolean; // Si se suben automáticamente al seleccionar
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 5,
  maxSizeInMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  initialImages = [],
  container = 'repair-images',
  folder,
  autoUpload = false
}: Props) {
  const [localImages, setLocalImages] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<ImageMetadata[]>(initialImages);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploading, error: uploadError, uploadImages, deleteImages, clearError } = useBlobStorage();

  // Sincronizar imágenes iniciales
  useEffect(() => {
    setUploadedImages(initialImages);
  }, [initialImages]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    await processFiles(fileArray);
  };

  const processFiles = async (files: File[]) => {
    setLocalError('');
    clearError();
    
    const maxSizeBytes = maxSizeInMB * 1024 * 1024;
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validar archivos
    files.forEach(file => {
      // Validar tipo
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }

      // Validar tamaño
      if (file.size > maxSizeBytes) {
        errors.push(`${file.name}: Archivo muy grande (máx. ${maxSizeInMB}MB)`);
        return;
      }

      validFiles.push(file);
    });

    // Validar límite total
    const totalImages = localImages.length + uploadedImages.length + validFiles.length;
    if (totalImages > maxImages) {
      errors.push(`Máximo ${maxImages} imágenes permitidas`);
    }

    if (errors.length > 0) {
      setLocalError(errors.join(', '));
      return;
    }

    if (autoUpload) {
      // Subir automáticamente
      try {
        const newUploadedImages = await uploadImages(validFiles, container, folder);
        const allUploadedImages = [...uploadedImages, ...newUploadedImages];
        setUploadedImages(allUploadedImages);
        onImagesChange(allUploadedImages);
      } catch (error) {
        console.error('Error uploading images:', error);
      }
    } else {
      // Mantener localmente para subir después
      const newPreviews: ImagePreview[] = validFiles.map(file => ({
        file,
        url: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9)
      }));

      const updatedLocalImages = [...localImages, ...newPreviews];
      setLocalImages(updatedLocalImages);
    }
  };

  const removeLocalImage = (id: string) => {
    const updatedImages = localImages.filter(img => {
      if (img.id === id) {
        URL.revokeObjectURL(img.url);
        return false;
      }
      return true;
    });
    
    setLocalImages(updatedImages);
  };

  const removeUploadedImage = async (imageId: string) => {
    const imageToRemove = uploadedImages.find(img => img._id === imageId);
    if (!imageToRemove) return;

    try {
      await deleteImages([imageToRemove.blobName], imageToRemove.containerName);
      const updatedImages = uploadedImages.filter(img => img._id !== imageId);
      setUploadedImages(updatedImages);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const uploadLocalImages = async () => {
    if (localImages.length === 0) return;

    try {
      const files = localImages.map(img => img.file);
      const newUploadedImages = await uploadImages(files, container, folder);
      
      // Limpiar imágenes locales
      localImages.forEach(img => URL.revokeObjectURL(img.url));
      setLocalImages([]);
      
      // Agregar a imágenes subidas
      const allUploadedImages = [...uploadedImages, ...newUploadedImages];
      setUploadedImages(allUploadedImages);
      onImagesChange(allUploadedImages);
    } catch (error) {
      console.error('Error uploading images:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      {/* Drop Zone */}
      <Box
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: dragOver ? 'action.hover' : 'transparent',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <Icon 
          icon="eva:cloud-upload-outline" 
          width={48} 
          height={48}
          color="text.secondary"
        />
        <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
          Arrastra las imágenes aquí
        </Typography>
        <Typography variant="body2" color="text.secondary">
          o haz clic para seleccionar archivos
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} • 
          Máx. {maxSizeInMB}MB cada una • 
          Hasta {maxImages} imágenes
        </Typography>
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Error Messages */}
      {(localError || uploadError) && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {uploadError?.includes('Azure Blob Storage is not properly configured') 
            ? 'Azure Blob Storage no está configurado. Verifica las variables de entorno AZURE_STORAGE_* en .env.local'
            : (localError || uploadError)
          }
        </Alert>
      )}

      {/* Loading */}
      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Subiendo imágenes a Azure...
          </Typography>
        </Box>
      )}

      {/* Upload Button for Local Images */}
      {!autoUpload && localImages.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={uploadLocalImages}
            disabled={uploading}
            startIcon={<Icon icon="eva:cloud-upload-outline" />}
          >
            Subir {localImages.length} imagen{localImages.length > 1 ? 'es' : ''}
          </Button>
        </Box>
      )}

      {/* Local Images Preview */}
      {localImages.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Imágenes pendientes de subir ({localImages.length})
          </Typography>
          
          <Grid container spacing={2}>
            {localImages.map((image) => (
              <Grid item xs={6} sm={4} md={3} key={image.id}>
                <Card sx={{ position: 'relative' }}>
                  {!autoUpload && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        backgroundColor: 'warning.main',
                        color: 'white',
                        borderRadius: '4px',
                        px: 0.5,
                        py: 0.25,
                        fontSize: '0.625rem',
                        zIndex: 1
                      }}
                    >
                      Local
                    </Box>
                  )}
                  
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={image.url}
                      alt="Preview"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    
                    <IconButton
                      size="small"
                      onClick={() => removeLocalImage(image.id)}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'error.dark'
                        }
                      }}
                    >
                      <Icon icon="eva:close-outline" width={16} />
                    </IconButton>
                  </Box>
                  
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Tooltip title={image.file.name}>
                      <Typography 
                        variant="caption" 
                        noWrap 
                        sx={{ display: 'block', fontWeight: 500 }}
                      >
                        {image.file.name}
                      </Typography>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(image.file.size)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Uploaded Images */}
      {uploadedImages.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Imágenes subidas ({uploadedImages.length})
          </Typography>
          
          <Grid container spacing={2}>
            {uploadedImages.map((image) => (
              <Grid item xs={6} sm={4} md={3} key={image._id}>
                <Card>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      backgroundColor: 'success.main',
                      color: 'white',
                      borderRadius: '4px',
                      px: 0.5,
                      py: 0.25,
                      fontSize: '0.625rem',
                      zIndex: 1
                    }}
                  >
                    <Icon icon="eva:cloud-done-outline" width={12} />
                  </Box>
                  
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      component="img"
                      src={image.url}
                      alt={image.originalName}
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    
                    <IconButton
                      size="small"
                      onClick={() => removeUploadedImage(image._id)}
                      disabled={uploading}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'error.dark'
                        }
                      }}
                    >
                      <Icon icon="eva:trash-2-outline" width={16} />
                    </IconButton>
                  </Box>
                  
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Tooltip title={image.originalName}>
                      <Typography 
                        variant="caption" 
                        noWrap 
                        sx={{ display: 'block', fontWeight: 500 }}
                      >
                        {image.originalName}
                      </Typography>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(image.size)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Add More Button */}
      {(localImages.length + uploadedImages.length) > 0 && (localImages.length + uploadedImages.length) < maxImages && (
        <Button
          variant="outlined"
          startIcon={<Icon icon="eva:plus-outline" />}
          onClick={openFileSelector}
          sx={{ mt: 2 }}
          disabled={uploading}
        >
          Agregar más imágenes ({maxImages - localImages.length - uploadedImages.length} restantes)
        </Button>
      )}
    </Box>
  );
}