import { RepairOrder } from '@/types/repair';

export interface NotificationRule {
  id: string;
  name: string;
  type: 'storage' | 'warranty' | 'general';
  enabled: boolean;
  conditions: {
    daysRemaining?: number;
    severity?: 'warning' | 'critical';
    deviceTypes?: string[];
    minimumCost?: number;
  };
  actions: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    inApp?: boolean;
    autoCall?: boolean;
  };
  schedule: {
    frequency: 'immediate' | 'daily' | 'weekly';
    time?: string; // HH:MM format
    daysOfWeek?: number[]; // 0-6, 0 = Sunday
  };
  template: {
    subject: string;
    message: string;
  };
  lastRun?: string;
  nextRun?: string;
}

export interface NotificationExecution {
  ruleId: string;
  executedAt: Date;
  recipientCount: number;
  successful: boolean;
  error?: string;
}

/**
 * Servicio de notificaciones automáticas (versión cliente)
 * Esta versión funciona en el navegador y no incluye implementaciones del servidor
 */
class AutomatedNotificationClientService {
  private rules: NotificationRule[] = [];
  private executionHistory: NotificationExecution[] = [];

  constructor() {
    this.loadRulesFromStorage();
  }

  /**
   * Obtiene todas las reglas de notificación
   */
  getRules(): NotificationRule[] {
    return [...this.rules];
  }

  /**
   * Obtiene una regla específica por ID
   */
  getRule(ruleId: string): NotificationRule | undefined {
    return this.rules.find(rule => rule.id === ruleId);
  }

  /**
   * Agrega una nueva regla de notificación
   */
  addRule(rule: NotificationRule): void {
    // Verificar que no exista una regla con el mismo ID
    if (this.rules.find(r => r.id === rule.id)) {
      throw new Error(`Ya existe una regla con el ID: ${rule.id}`);
    }

    // Calcular próxima ejecución
    rule.nextRun = this.calculateNextRun(rule).toISOString();

    this.rules.push(rule);
    this.saveRulesToStorage();
  }

  /**
   * Actualiza una regla existente
   */
  updateRule(ruleId: string, updates: Partial<NotificationRule>): void {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      throw new Error(`No se encontró la regla con ID: ${ruleId}`);
    }

    const updatedRule = {
      ...this.rules[ruleIndex],
      ...updates
    };

    // Recalcular próxima ejecución si cambió la programación
    if (updates.schedule || updates.enabled !== undefined) {
      updatedRule.nextRun = updates.enabled !== false 
        ? this.calculateNextRun(updatedRule).toISOString()
        : undefined;
    }

    this.rules[ruleIndex] = updatedRule;
    this.saveRulesToStorage();
  }

  /**
   * Elimina una regla
   */
  removeRule(ruleId: string): void {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) {
      throw new Error(`No se encontró la regla con ID: ${ruleId}`);
    }

    this.rules.splice(ruleIndex, 1);
    this.saveRulesToStorage();
  }

  /**
   * Simula la ejecución de una regla (para testing)
   */
  async testRule(ruleId: string): Promise<NotificationExecution> {
    const rule = this.getRule(ruleId);
    if (!rule) {
      throw new Error(`No se encontró la regla con ID: ${ruleId}`);
    }

    if (!rule.enabled) {
      throw new Error('La regla está deshabilitada');
    }

    // Simular ejecución
    const execution: NotificationExecution = {
      ruleId,
      executedAt: new Date(),
      recipientCount: Math.floor(Math.random() * 10) + 1, // Simular entre 1-10 destinatarios
      successful: Math.random() > 0.1 // 90% de éxito
    };

    if (!execution.successful) {
      execution.error = 'Error simulado de prueba';
    }

    this.executionHistory.unshift(execution);
    
    // Mantener solo las últimas 100 ejecuciones
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }

    console.log('🧪 Regla de prueba ejecutada:', execution);

    return execution;
  }

  /**
   * Obtiene el historial de ejecuciones
   */
  getExecutionHistory(ruleId?: string): NotificationExecution[] {
    if (ruleId) {
      return this.executionHistory.filter(exec => exec.ruleId === ruleId);
    }
    return [...this.executionHistory];
  }

  /**
   * Obtiene estadísticas de las reglas
   */
  getStats() {
    const totalRules = this.rules.length;
    const activeRules = this.rules.filter(rule => rule.enabled).length;
    const recentExecutions = this.executionHistory.filter(
      exec => (Date.now() - exec.executedAt.getTime()) < 24 * 60 * 60 * 1000
    ).length;

    return {
      totalRules,
      activeRules,
      inactiveRules: totalRules - activeRules,
      recentExecutions,
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * Calcula la próxima ejecución de una regla
   */
  private calculateNextRun(rule: NotificationRule): Date {
    const now = new Date();
    
    if (rule.schedule.frequency === 'immediate') {
      return now;
    }

    const nextRun = new Date(now);
    
    if (rule.schedule.time) {
      const [hours, minutes] = rule.schedule.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    }

    switch (rule.schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
      
      case 'weekly':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Calcula la tasa de éxito
   */
  private calculateSuccessRate(): number {
    if (this.executionHistory.length === 0) return 100;
    
    const successful = this.executionHistory.filter(exec => exec.successful).length;
    return Math.round((successful / this.executionHistory.length) * 100);
  }

  /**
   * Carga reglas desde localStorage
   */
  private loadRulesFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('notification-rules');
      if (stored) {
        this.rules = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error cargando reglas desde localStorage:', error);
      this.rules = [];
    }
  }

  /**
   * Guarda reglas en localStorage
   */
  private saveRulesToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('notification-rules', JSON.stringify(this.rules));
    } catch (error) {
      console.warn('Error guardando reglas en localStorage:', error);
    }
  }

  /**
   * Inicializa reglas predeterminadas
   */
  initializeDefaultRules(): void {
    if (this.rules.length > 0) return;

    const defaultRules: NotificationRule[] = [
      {
        id: 'critical-storage-alert',
        name: 'Alerta Crítica de Almacenamiento',
        type: 'storage',
        enabled: true,
        conditions: {
          daysRemaining: 3,
          severity: 'critical'
        },
        actions: {
          whatsapp: true,
          email: true,
          inApp: true
        },
        schedule: {
          frequency: 'daily',
          time: '09:00'
        },
        template: {
          subject: '🚨 Alerta Crítica: Almacenamiento por vencer',
          message: 'El dispositivo {deviceType} de {clientName} debe ser recogido en {daysRemaining} días. Costo actual: ${cost}'
        }
      },
      {
        id: 'warranty-expiration-warning',
        name: 'Advertencia de Vencimiento de Garantía',
        type: 'warranty',
        enabled: true,
        conditions: {
          daysRemaining: 30,
          severity: 'warning'
        },
        actions: {
          email: true,
          inApp: true
        },
        schedule: {
          frequency: 'weekly',
          time: '10:00'
        },
        template: {
          subject: '⚠️ Su garantía vence pronto',
          message: 'Estimado {clientName}, su garantía para {deviceType} vence en {daysRemaining} días. ¿Necesita algún servicio?'
        }
      }
    ];

    defaultRules.forEach(rule => {
      try {
        this.addRule(rule);
      } catch (error) {
        console.warn('Error agregando regla por defecto:', error);
      }
    });
  }
}

// Instancia singleton
export const automatedNotificationClientService = new AutomatedNotificationClientService();
export default automatedNotificationClientService;