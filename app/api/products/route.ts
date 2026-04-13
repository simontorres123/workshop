import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { CreateProductRequest, ProductFilters } from '@/types/product';

const productRepository = RepositoryFactory.getInventory();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: ProductFilters = {
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      // Note: inStock is not part of ProductFilters, using lowStock instead
      lowStock: searchParams.get('lowStock') ? searchParams.get('lowStock') === 'true' : undefined,
      branchId: searchParams.get('branchId') || undefined,
    };

    const products = await productRepository.search(filters);
    
    return NextResponse.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo productos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productData: CreateProductRequest = body;

    if (!productData.name || !productData.category || !productData.price) {
      return NextResponse.json(
        { success: false, error: 'Nombre, categoría y precio son obligatorios' },
        { status: 400 }
      );
    }

    if (productData.sku) {
      const existingProduct = await productRepository.getBySku(productData.sku);
      if (existingProduct) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un producto con este SKU' },
          { status: 400 }
        );
      }
    }

    const product = await productRepository.create(productData);
    
    return NextResponse.json({
      success: true,
      data: product
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error creando producto' },
      { status: 500 }
    );
  }
}