import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/repositories/product.repository';
import { UpdateProductRequest } from '@/types/product';

const productRepository = new ProductRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    const product = await productRepository.getById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo producto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateProductRequest = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    if (body.sku) {
      const existingProduct = await productRepository.getBySku(body.sku);
      if (existingProduct && existingProduct.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otro producto con este SKU' },
          { status: 400 }
        );
      }
    }

    const product = await productRepository.update(id, body);
    
    return NextResponse.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error actualizando producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    const success = await productRepository.delete(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Error eliminando producto' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando producto' },
      { status: 500 }
    );
  }
}