// Función para extraer el account name del connection string
const getAccountNameFromConnectionString = (connectionString: string): string => {
  try {
    const match = connectionString.match(/AccountName=([^;]+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
};

// Configuración de Azure Blob Storage
export const AZURE_CONFIG = {
  // Estas variables deben estar en las variables de entorno
  STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME || 
    getAccountNameFromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING || ''),
  STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY || '',
  STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
  
  // Contenedores
  CONTAINERS: {
    REPAIR_IMAGES: 'repair-images',
    PRODUCT_IMAGES: 'product-images',
    DOCUMENTS: 'documents'
  },
  
  // Configuración de archivos
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif'
  ],
  
  // URLs y CDN
  BLOB_URL_BASE: `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME || 
    getAccountNameFromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING || '') || 'workshop'}.blob.core.windows.net/`,
} as const;

// Validar configuración
export const validateAzureConfig = (): boolean => {
  // Opción 1: Connection string (recomendado)
  if (AZURE_CONFIG.STORAGE_CONNECTION_STRING && AZURE_CONFIG.STORAGE_CONNECTION_STRING.length > 0) {
    return true;
  }
  
  // Opción 2: Credenciales separadas
  const required = [
    AZURE_CONFIG.STORAGE_ACCOUNT_NAME,
    AZURE_CONFIG.STORAGE_ACCOUNT_KEY
  ];
  
  return required.every(value => value && value.length > 0);
};

// Generar URL completa del blob
export const getBlobUrl = (containerName: string, blobName: string): string => {
  return `${AZURE_CONFIG.BLOB_URL_BASE}${containerName}/${blobName}`;
};

// Generar nombre único para blob
export const generateBlobName = (originalName: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};