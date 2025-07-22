import { Container } from '@azure/cosmos';
import { getContainer } from '@/lib/cosmosdb';
import { Product } from '@/types';
import { COSMOS_DB_CONTAINERS } from '@/constants';

let productContainer: Container;

async function getProductContainer() {
  if (!productContainer) {
    productContainer = await getContainer(COSMOS_DB_CONTAINERS.PRODUCTS);
  }
  return productContainer;
}

export const inventoryService = {
  async getProducts(filters = {}) {
    const container = await getProductContainer();
    // La lógica de filtros para Cosmos DB es diferente, se usa SQL-like queries
    const { resources: products } = await container.items.readAll<Product>().fetchAll();
    return products;
  },

  async getProductById(id: string) {
    const container = await getProductContainer();
    const { resource: product } = await container.item(id, id).read<Product>();
    return product;
  },

  async createProduct(productData: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) {
    const container = await getProductContainer();
    const newProduct = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { resource: createdProduct } = await container.items.create(newProduct);
    return createdProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>) {
    const container = await getProductContainer();
    const { resource: item } = await container.item(id, id).read<Product>();
    if (!item) throw new Error('Product not found');

    const updatedItem = { ...item, ...updates, updatedAt: new Date() };
    const { resource: updatedProduct } = await container.item(id, id).replace(updatedItem);
    return updatedProduct;
  },

  async deleteProduct(id: string) {
    const container = await getProductContainer();
    await container.item(id, id).delete();
  },

  async checkLowStock() {
    const container = await getProductContainer();
    const querySpec = {
      query: "SELECT * FROM c WHERE c.stock <= c.lowStockThreshold"
    };
    const { resources: products } = await container.items.query<Product>(querySpec).fetchAll();
    return products;
  },
};
