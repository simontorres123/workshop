import { NextRequest, NextResponse } from 'next/server';
import { RepositoryFactory } from '@/repositories/repository.factory';
import { generateWarrantyReport, exportWarrantyReport, ReportFilters } from '@/utils/warranty-reports';

// GET /api/reports/warranty - Generar reporte de garantías
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parámetros de filtros
    const filters: ReportFilters = {};
    
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!);
    }
    
    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!);
    }
    
    if (searchParams.get('deviceTypes')) {
      filters.deviceTypes = searchParams.get('deviceTypes')!.split(',');
    }
    
    if (searchParams.get('clients')) {
      filters.clients = searchParams.get('clients')!.split(',');
    }
    
    if (searchParams.get('warrantyStatus')) {
      filters.warrantyStatus = searchParams.get('warrantyStatus') as any;
    }
    
    filters.includeClaims = searchParams.get('includeClaims') === 'true';
    
    // Formato de exportación
    const exportFormat = searchParams.get('format') as 'json' | 'csv' | 'text' || 'json';

    // Obtener todas las órdenes
    const repository = RepositoryFactory.getRepairOrders();
    const orders = await repository.findAll();
    
    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { success: false, error: 'Error obteniendo órdenes de reparación' },
        { status: 500 }
      );
    }

    // Generar el reporte
    const report = generateWarrantyReport(orders, filters);

    // Si se solicita exportación, devolver el contenido formateado
    if (exportFormat !== 'json') {
      const exportedContent = exportWarrantyReport(report, exportFormat);
      
      const headers = new Headers();
      
      switch (exportFormat) {
        case 'csv':
          headers.set('Content-Type', 'text/csv; charset=utf-8');
          headers.set('Content-Disposition', `attachment; filename="reporte-garantias-${report.generatedAt.getTime()}.csv"`);
          break;
        case 'text':
          headers.set('Content-Type', 'text/plain; charset=utf-8');
          headers.set('Content-Disposition', `attachment; filename="reporte-garantias-${report.generatedAt.getTime()}.txt"`);
          break;
      }
      
      return new Response(exportedContent, { headers });
    }

    // Devolver JSON por defecto
    return NextResponse.json({
      success: true,
      data: report,
      message: 'Reporte de garantías generado exitosamente'
    });

  } catch (error) {
    console.error('Error generating warranty report:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando reporte de garantías' },
      { status: 500 }
    );
  }
}

// POST /api/reports/warranty - Generar reporte personalizado con filtros complejos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters = {}, options = {} } = body;

    // Obtener todas las órdenes
    const repository = RepositoryFactory.getRepairOrders();
    const orders = await repository.findAll();
    
    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { success: false, error: 'Error obteniendo órdenes de reparación' },
        { status: 500 }
      );
    }

    // Aplicar conversiones de fecha si existen
    const processedFilters: ReportFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined
    };

    // Generar el reporte
    const report = generateWarrantyReport(orders, processedFilters);

    // Opciones adicionales de procesamiento
    if (options.includeRawData) {
      (report as any).rawData = {
        totalOrdersProcessed: orders.length,
        filteredOrdersCount: orders.filter(order => 
          processedFilters.dateFrom ? new Date(order.createdAt) >= processedFilters.dateFrom : true
        ).length,
        processingTime: Date.now() - report.generatedAt.getTime()
      };
    }

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Reporte personalizado generado exitosamente'
    });

  } catch (error) {
    console.error('Error generating custom warranty report:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando reporte personalizado' },
      { status: 500 }
    );
  }
}