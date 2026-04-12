import { RepairOrder } from '@/types/repair';
import { StorageAlert } from '@/utils/storageAlerts';
import { WarrantyAlert } from '@/utils/warrantyAlerts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  includeImages?: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  filters?: {
    deviceTypes?: string[];
    statuses?: string[];
    urgentOnly?: boolean;
  };
  template?: 'detailed' | 'summary' | 'executive';
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  generatedBy?: string;
  orders: RepairOrder[];
  storageAlerts: StorageAlert[];
  warrantyAlerts: WarrantyAlert[];
  summary: {
    totalOrders: number;
    totalCost: number;
    averageDays: number;
    criticalAlerts: number;
  };
}

/**
 * Servicio de exportación de reportes
 */
class ReportExporter {
  
  /**
   * Exporta datos a CSV
   */
  exportToCSV(data: ReportData, options: ExportOptions): string {
    const { template = 'detailed' } = options;
    const lines: string[] = [];

    // Header del reporte
    lines.push(`"Reporte de Garantías y Almacenamiento"`);
    lines.push(`"Generado","${format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}"`);
    lines.push(`"Total de órdenes","${data.summary.totalOrders}"`);
    lines.push(`"Alertas críticas","${data.summary.criticalAlerts}"`);
    lines.push('');

    if (template === 'detailed') {
      // Sección de órdenes detalladas
      lines.push('"=== ÓRDENES DE REPARACIÓN ==="');
      lines.push('"Folio","Cliente","Teléfono","Dispositivo","Estado","Costo","Completado","Días en Almacén","Alerta"');
      
      data.orders.forEach(order => {
        const completedAt = order.completedAt ? format(new Date(order.completedAt), 'dd/MM/yyyy') : 'N/A';
        const daysInStorage = order.completedAt 
          ? Math.floor((Date.now() - new Date(order.completedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const alert = [...data.storageAlerts, ...data.warrantyAlerts]
          .find(a => a.id === order.id);
        
        const alertInfo = alert 
          ? `${alert.type === 'storage' ? 'Almacén' : 'Garantía'} - ${alert.severity}`
          : 'Sin alerta';

        lines.push(
          `"${order.folio}","${order.clientName}","${order.clientPhone}","${order.deviceType}","${order.status}","${order.totalCost || 0}","${completedAt}","${daysInStorage}","${alertInfo}"`
        );
      });

      lines.push('');
    }

    // Sección de alertas críticas
    if (data.storageAlerts.length > 0) {
      lines.push('"=== ALERTAS DE ALMACENAMIENTO ==="');
      lines.push('"Folio","Cliente","Dispositivo","Días Restantes","Severidad","Costo Estimado","Fecha Vencimiento"');
      
      data.storageAlerts.forEach(alert => {
        const cost = (alert as StorageAlert).estimatedCost || 0;
        const expirationDate = format(alert.expirationDate, 'dd/MM/yyyy');
        
        lines.push(
          `"${alert.folio}","${alert.clientName}","${alert.deviceType}","${alert.daysRemaining}","${alert.severity}","${cost}","${expirationDate}"`
        );
      });

      lines.push('');
    }

    // Sección de alertas de garantía
    if (data.warrantyAlerts.length > 0) {
      lines.push('"=== ALERTAS DE GARANTÍA ==="');
      lines.push('"Folio","Cliente","Dispositivo","Días Restantes","Severidad","Fecha Vencimiento"');
      
      data.warrantyAlerts.forEach(alert => {
        const expirationDate = format(alert.expirationDate, 'dd/MM/yyyy');
        
        lines.push(
          `"${alert.folio}","${alert.clientName}","${alert.deviceType}","${alert.daysRemaining}","${alert.severity}","${expirationDate}"`
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * Exporta datos a JSON
   */
  exportToJSON(data: ReportData, options: ExportOptions): string {
    const { template = 'detailed' } = options;
    
    const exportData: Record<string, any> = {
      metadata: {
        title: data.title,
        generatedAt: data.generatedAt.toISOString(),
        generatedBy: data.generatedBy || 'Sistema',
        format: 'JSON',
        template,
        version: '1.0'
      },
      summary: data.summary
    };

    if (template === 'detailed') {
      exportData.orders = data.orders.map(order => ({
        ...order,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        completedAt: order.completedAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString()
      }));
    }

    exportData.alerts = {
      storage: data.storageAlerts.map(alert => ({
        ...alert,
        expirationDate: alert.expirationDate.toISOString()
      })),
      warranty: data.warrantyAlerts.map(alert => ({
        ...alert,
        expirationDate: alert.expirationDate.toISOString()
      }))
    };

    // Agregar estadísticas adicionales
    exportData.statistics = {
      totalRevenue: data.orders.reduce((sum, order) => sum + (order.totalCost || 0), 0),
      averageRepairTime: this.calculateAverageRepairTime(data.orders),
      deviceTypeBreakdown: this.getDeviceTypeBreakdown(data.orders),
      monthlyTrends: this.getMonthlyTrends(data.orders)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Genera reporte en formato PDF usando jsPDF
   */
  async exportToPDF(data: ReportData, options: ExportOptions): Promise<Blob> {
    // Importación dinámica para evitar problemas SSR
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configuración de fuentes y colores
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Función helper para agregar texto con wrapping
    const addText = (text: string, x: number, y: number, options: { fontSize?: number; bold?: boolean; maxWidth?: number; spacing?: number } = {}) => {
      const fontSize = options.fontSize || 10;
      const maxWidth = options.maxWidth || pageWidth - (margin * 2);
      
      doc.setFontSize(fontSize);
      if (options.bold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * fontSize * 0.35) + (options.spacing || 5);
    };

    // Función para verificar si necesita nueva página
    const checkNewPage = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Header del documento
    yPosition = addText(data.title, margin, yPosition, { 
      fontSize: 18, 
      bold: true, 
      spacing: 10 
    });

    yPosition = addText(
      `Generado: ${format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}`, 
      margin, yPosition, { fontSize: 10, spacing: 15 }
    );

    // Resumen ejecutivo
    checkNewPage(40);
    yPosition = addText('RESUMEN EJECUTIVO', margin, yPosition, { 
      fontSize: 14, 
      bold: true, 
      spacing: 10 
    });

    const summaryText = `
Total de Órdenes: ${data.summary.totalOrders}
Alertas Críticas: ${data.summary.criticalAlerts}
Costo Total: $${data.summary.totalCost.toLocaleString()}
Promedio de Días: ${data.summary.averageDays}`;

    yPosition = addText(summaryText, margin, yPosition, { spacing: 15 });

    // Sección de órdenes (si hay)
    if (data.orders.length > 0 && options.template === 'detailed') {
      checkNewPage(60);
      yPosition = addText('ÓRDENES DE REPARACIÓN', margin, yPosition, { 
        fontSize: 14, 
        bold: true, 
        spacing: 10 
      });

      // Headers de tabla
      const tableHeaders = ['Folio', 'Cliente', 'Dispositivo', 'Estado', 'Costo'];
      const colWidths = [30, 40, 35, 25, 25];
      let xPos = margin;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      tableHeaders.forEach((header, index) => {
        doc.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 8;

      // Línea separadora
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

      // Datos de la tabla
      doc.setFont('helvetica', 'normal');
      data.orders.slice(0, 15).forEach((order) => { // Limitar a 15 órdenes por espacio
        checkNewPage(8);
        
        xPos = margin;
        const rowData = [
          order.folio || 'N/A',
          order.clientName || 'N/A',
          order.deviceType || 'N/A',
          order.status || 'N/A',
          `$${(order.totalCost || 0).toLocaleString()}`
        ];

        rowData.forEach((cell, index) => {
          const cellText = doc.splitTextToSize(cell, colWidths[index] - 2);
          doc.text(cellText[0] || '', xPos, yPosition); // Solo primera línea por espacio
          xPos += colWidths[index];
        });
        
        yPosition += 8;
      });

      yPosition += 10;
    }

    // Sección de alertas críticas
    const criticalAlerts = [...data.storageAlerts, ...data.warrantyAlerts]
      .filter(alert => alert.severity === 'critical');

    if (criticalAlerts.length > 0) {
      checkNewPage(60);
      yPosition = addText('ALERTAS CRÍTICAS', margin, yPosition, { 
        fontSize: 14, 
        bold: true, 
        spacing: 10 
      });

      criticalAlerts.slice(0, 10).forEach((alert) => { // Limitar alertas por espacio
        checkNewPage(20);
        
        const alertText = `
Folio: ${alert.folio}
Cliente: ${alert.clientName}
Tipo: ${alert.type === 'storage' ? 'Almacenamiento' : 'Garantía'}
Días Restantes: ${alert.daysRemaining}
Vencimiento: ${format(alert.expirationDate, 'dd/MM/yyyy')}`;

        yPosition = addText(alertText, margin, yPosition, { 
          fontSize: 9, 
          spacing: 10 
        });
      });
    }

    // Footer
    const footerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte generado automáticamente por el Sistema de Gestión de Reparaciones', 
             margin, footerY);

    // Retornar como Blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Genera reporte HTML para preview o PDF
   */
  generateHTMLReport(data: ReportData, options: ExportOptions): string {
    const { template = 'detailed' } = options;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${data.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .critical { background-color: #ffebee; }
        .warning { background-color: #fff3e0; }
        .success { background-color: #e8f5e8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.title}</h1>
        <p>Generado: ${format(data.generatedAt, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
    </div>

    <div class="summary">
        <h2>Resumen Ejecutivo</h2>
        <div style="display: flex; gap: 20px;">
            <div><strong>Total de Órdenes:</strong> ${data.summary.totalOrders}</div>
            <div><strong>Alertas Críticas:</strong> ${data.summary.criticalAlerts}</div>
            <div><strong>Costo Total:</strong> $${data.summary.totalCost.toLocaleString()}</div>
        </div>
    </div>

    ${template === 'detailed' ? this.generateDetailedHTMLTables(data) : this.generateSummaryHTML(data)}

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666;">
        <p>Reporte generado automáticamente por el Sistema de Gestión de Reparaciones</p>
        <p>Para más información, contacte al administrador del sistema</p>
    </div>
</body>
</html>`;
  }

  private generateDetailedHTMLTables(data: ReportData): string {
    let html = '';

    // Tabla de órdenes
    if (data.orders.length > 0) {
      html += `
        <div class="section">
            <h2>Órdenes de Reparación</h2>
            <table>
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Cliente</th>
                        <th>Dispositivo</th>
                        <th>Estado</th>
                        <th>Costo</th>
                        <th>Completado</th>
                    </tr>
                </thead>
                <tbody>`;

      data.orders.forEach(order => {
        const completedAt = order.completedAt 
          ? format(new Date(order.completedAt), 'dd/MM/yyyy') 
          : 'Pendiente';
        
        html += `
                    <tr>
                        <td>${order.folio}</td>
                        <td>${order.clientName}</td>
                        <td>${order.deviceType}</td>
                        <td>${order.status}</td>
                        <td>$${(order.totalCost || 0).toLocaleString()}</td>
                        <td>${completedAt}</td>
                    </tr>`;
      });

      html += `
                </tbody>
            </table>
        </div>`;
    }

    // Tabla de alertas críticas
    const criticalAlerts = [...data.storageAlerts, ...data.warrantyAlerts]
      .filter(alert => alert.severity === 'critical');

    if (criticalAlerts.length > 0) {
      html += `
        <div class="section">
            <h2>Alertas Críticas</h2>
            <table>
                <thead>
                    <tr>
                        <th>Folio</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Días Restantes</th>
                        <th>Vencimiento</th>
                    </tr>
                </thead>
                <tbody>`;

      criticalAlerts.forEach(alert => {
        html += `
                    <tr class="critical">
                        <td>${alert.folio}</td>
                        <td>${alert.clientName}</td>
                        <td>${alert.type === 'storage' ? 'Almacenamiento' : 'Garantía'}</td>
                        <td>${alert.daysRemaining}</td>
                        <td>${format(alert.expirationDate, 'dd/MM/yyyy')}</td>
                    </tr>`;
      });

      html += `
                </tbody>
            </table>
        </div>`;
    }

    return html;
  }

  private generateSummaryHTML(data: ReportData): string {
    const deviceBreakdown = this.getDeviceTypeBreakdown(data.orders);
    
    return `
      <div class="section">
          <h2>Resumen por Tipo de Dispositivo</h2>
          <table>
              <thead>
                  <tr>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Costo Promedio</th>
                  </tr>
              </thead>
              <tbody>
                  ${Object.entries(deviceBreakdown).map(([type, data]) => `
                      <tr>
                          <td>${type}</td>
                          <td>${data.count}</td>
                          <td>$${(data.averageCost).toLocaleString()}</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
      </div>`;
  }

  /**
   * Descarga un archivo
   */
  downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Calcula tiempo promedio de reparación
   */
  private calculateAverageRepairTime(orders: RepairOrder[]): number {
    const completedOrders = orders.filter(order => order.completedAt && order.createdAt);
    
    if (completedOrders.length === 0) return 0;
    
    const totalDays = completedOrders.reduce((sum, order) => {
      const created = new Date(order.createdAt).getTime();
      const completed = new Date(order.completedAt!).getTime();
      return sum + Math.floor((completed - created) / (1000 * 60 * 60 * 24));
    }, 0);
    
    return Math.round(totalDays / completedOrders.length);
  }

  /**
   * Obtiene breakdown por tipo de dispositivo
   */
  private getDeviceTypeBreakdown(orders: RepairOrder[]): Record<string, { count: number; averageCost: number }> {
    const breakdown: Record<string, { count: number; totalCost: number; averageCost: number }> = {};
    
    orders.forEach(order => {
      if (!breakdown[order.deviceType]) {
        breakdown[order.deviceType] = { count: 0, totalCost: 0, averageCost: 0 };
      }
      
      breakdown[order.deviceType].count++;
      breakdown[order.deviceType].totalCost += order.totalCost || 0;
    });
    
    // Calcular promedios
    Object.keys(breakdown).forEach(type => {
      breakdown[type].averageCost = breakdown[type].count > 0 
        ? breakdown[type].totalCost / breakdown[type].count 
        : 0;
    });
    
    return breakdown;
  }

  /**
   * Obtiene tendencias mensuales
   */
  private getMonthlyTrends(orders: RepairOrder[]): Record<string, { count: number; revenue: number }> {
    const trends: Record<string, { count: number; revenue: number }> = {};
    
    orders.forEach(order => {
      const monthKey = format(new Date(order.createdAt), 'yyyy-MM');
      
      if (!trends[monthKey]) {
        trends[monthKey] = { count: 0, revenue: 0 };
      }
      
      trends[monthKey].count++;
      trends[monthKey].revenue += order.totalCost || 0;
    });
    
    return trends;
  }
}

export const reportExporter = new ReportExporter();
export default reportExporter;