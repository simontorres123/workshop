interface ImageMetadata {
  url: string;        // URL pública del blob en Azure
  blobName: string;   // Nombre del archivo en el contenedor
  container: string;  // Contenedor de Azure
}

interface Product {
  _id: string;        // ID de MongoDB
  name: string;
  description: string;
  brand: string;
  model: string;
  price: number;
  stock: number;
  lowStockThreshold: number; // Umbral para alerta de bajo inventario
  images: ImageMetadata[];
  createdAt: Date;
  updatedAt: Date;
}
