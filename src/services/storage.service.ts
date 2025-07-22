import { BlobServiceClient } from '@azure/storage-blob';
import { getBlobServiceClient } from '@/lib/azure'; // Suponiendo que el cliente estará aquí

export const storageService = {
  async uploadImage(containerName: string, file: File, blobName: string) {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Convertir File a Buffer para subirlo
    const buffer = Buffer.from(await file.arrayBuffer());
    await blockBlobClient.uploadData(buffer);

    return blockBlobClient.url;
  },

  async deleteImage(containerName: string, blobName: string) {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.deleteBlob(blobName);
  },

  getImageUrl(containerName: string, blobName: string): string {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  },
};
