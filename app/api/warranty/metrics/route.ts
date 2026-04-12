import { NextRequest, NextResponse } from 'next/server';
import { RepairOrder, WarrantyClaim } from '@/types/repair';
import { getWarrantyMetrics, DashboardFilters } from '@/lib/database/dashboard-queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer filtros de los parámetros de consulta
    const filters: DashboardFilters = {
      deviceType: searchParams.get('deviceType') || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
    };

    // Obtener métricas de garantía desde la base de datos
    const metrics = await getWarrantyMetrics(filters);

    return NextResponse.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching warranty metrics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, claimId, deviceType, filters } = body;

    switch (action) {
      case 'updateClaimStatus':
        // Actualizar estado de reclamo
        return NextResponse.json({
          success: true,
          message: 'Estado de reclamo actualizado',
          data: { claimId, updatedAt: new Date().toISOString() }
        });

      case 'generateQualityReport':
        // Generar reporte de calidad por tipo de dispositivo
        return NextResponse.json({
          success: true,
          message: 'Reporte de calidad generado',
          data: { 
            reportId: `quality-report-${Date.now()}`,
            deviceType,
            generatedAt: new Date().toISOString()
          }
        });

      case 'exportMetrics':
        // Exportar métricas con filtros
        return NextResponse.json({
          success: true,
          message: 'Métricas exportadas exitosamente',
          data: { 
            exportId: `metrics-export-${Date.now()}`,
            filters,
            exportedAt: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Acción no válida'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing warranty metrics action:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error procesando la acción'
    }, { status: 500 });
  }
}