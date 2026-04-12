import { DigitalSignature } from '@/types/repair';

export interface SignatureValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    signatureAge: number; // en días
    deviceFingerprint: string;
    trustLevel: 'high' | 'medium' | 'low';
  };
}

export interface SignatureVerificationRequest {
  signature: DigitalSignature;
  documentHash?: string;
  expectedSigner?: string;
  maxAgeHours?: number;
}

class DigitalSignatureService {
  /**
   * Valida la integridad de una firma digital
   */
  async validateSignature(signature: DigitalSignature): Promise<SignatureValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar estructura básica
      if (!signature.id || !signature.signatureDataURL || !signature.signerName) {
        errors.push('Firma incompleta: faltan campos obligatorios');
      }

      // Validar formato de la imagen
      if (signature.signatureDataURL && !signature.signatureDataURL.startsWith('data:image/')) {
        errors.push('Formato de firma inválido');
      }

      // Validar timestamp
      if (!signature.timestamp || new Date(signature.timestamp) > new Date()) {
        errors.push('Timestamp de firma inválido');
      }

      // Validar metadatos
      if (!signature.metadata || 
          signature.metadata.strokeCount < 1 || 
          signature.metadata.duration < 100) {
        warnings.push('La firma parece muy simple o rápida');
      }

      // Calcular edad de la firma
      const signatureAge = Math.floor(
        (Date.now() - new Date(signature.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Advertencias por edad
      if (signatureAge > 365) {
        warnings.push('La firma tiene más de un año');
      } else if (signatureAge > 90) {
        warnings.push('La firma tiene más de 3 meses');
      }

      // Generar fingerprint del dispositivo (simplificado)
      const deviceFingerprint = this.generateDeviceFingerprint(signature.deviceInfo);

      // Calcular nivel de confianza
      let trustLevel: 'high' | 'medium' | 'low' = 'high';
      
      if (errors.length > 0) {
        trustLevel = 'low';
      } else if (warnings.length > 1 || signatureAge > 90) {
        trustLevel = 'medium';
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          signatureAge,
          deviceFingerprint,
          trustLevel
        }
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Error validating signature: ' + (error instanceof Error ? error.message : 'Unknown error')],
        warnings: [],
        metadata: {
          signatureAge: 0,
          deviceFingerprint: '',
          trustLevel: 'low'
        }
      };
    }
  }

  /**
   * Verifica una firma contra criterios específicos
   */
  async verifySignature(request: SignatureVerificationRequest): Promise<SignatureValidation> {
    const baseValidation = await this.validateSignature(request.signature);
    
    // Verificaciones adicionales
    const additionalErrors: string[] = [...baseValidation.errors];
    const additionalWarnings: string[] = [...baseValidation.warnings];

    // Verificar firmante esperado
    if (request.expectedSigner && 
        request.signature.signerName.toLowerCase() !== request.expectedSigner.toLowerCase()) {
      additionalErrors.push(`Firmante no coincide. Esperado: ${request.expectedSigner}, Actual: ${request.signature.signerName}`);
    }

    // Verificar edad máxima
    if (request.maxAgeHours) {
      const signatureAgeHours = (Date.now() - new Date(request.signature.timestamp).getTime()) / (1000 * 60 * 60);
      if (signatureAgeHours > request.maxAgeHours) {
        additionalErrors.push(`Firma expirada. Edad: ${Math.floor(signatureAgeHours)}h, Máximo: ${request.maxAgeHours}h`);
      }
    }

    return {
      ...baseValidation,
      isValid: additionalErrors.length === 0,
      errors: additionalErrors,
      warnings: additionalWarnings
    };
  }

  /**
   * Genera un hash de verificación para un documento firmado
   */
  async generateDocumentHash(content: string): Promise<string> {
    try {
      // Usar Web Crypto API si está disponible
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback simple para Node.js o entornos sin Web Crypto
        return this.simpleHash(content);
      }
    } catch (error) {
      console.warn('Error generating document hash:', error);
      return this.simpleHash(content);
    }
  }

  /**
   * Combina múltiples firmas en un documento de verificación
   */
  async createSignatureBundle(signatures: DigitalSignature[], documentContent?: string): Promise<{
    bundleId: string;
    documentHash?: string;
    signatures: DigitalSignature[];
    createdAt: Date;
    metadata: {
      totalSignatures: number;
      signerRoles: string[];
      validationResults: SignatureValidation[];
    };
  }> {
    const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generar hash del documento si se proporciona
    const documentHash = documentContent ? await this.generateDocumentHash(documentContent) : undefined;
    
    // Validar todas las firmas
    const validationResults = await Promise.all(
      signatures.map(signature => this.validateSignature(signature))
    );

    // Extraer roles únicos
    const signerRoles = [...new Set(signatures.map(sig => sig.signerRole))];

    return {
      bundleId,
      documentHash,
      signatures,
      createdAt: new Date(),
      metadata: {
        totalSignatures: signatures.length,
        signerRoles,
        validationResults
      }
    };
  }

  /**
   * Exporta firmas a formato para auditoría
   */
  async exportSignatureAuditLog(signatures: DigitalSignature[]): Promise<string> {
    const auditEntries = [];
    
    for (const signature of signatures) {
      const validation = await this.validateSignature(signature);
      
      auditEntries.push({
        signatureId: signature.id,
        signer: {
          name: signature.signerName,
          role: signature.signerRole
        },
        timestamp: signature.timestamp,
        validation: {
          isValid: validation.isValid,
          trustLevel: validation.metadata.trustLevel,
          errors: validation.errors,
          warnings: validation.warnings
        },
        technical: {
          deviceInfo: signature.deviceInfo,
          ipAddress: signature.ipAddress || 'N/A',
          strokeCount: signature.metadata.strokeCount,
          duration: signature.metadata.duration,
          dimensions: `${signature.metadata.width}x${signature.metadata.height}`
        }
      });
    }

    return JSON.stringify({
      auditLog: {
        generatedAt: new Date().toISOString(),
        totalSignatures: signatures.length,
        entries: auditEntries
      }
    }, null, 2);
  }

  /**
   * Compara dos firmas para detectar similitudes (para prevenir fraude)
   */
  async compareSignatures(signature1: DigitalSignature, signature2: DigitalSignature): Promise<{
    similarity: number; // 0-1
    suspiciousFactors: string[];
    recommendation: 'accept' | 'review' | 'reject';
  }> {
    const suspiciousFactors: string[] = [];
    let similarity = 0;

    // Comparar metadatos básicos
    if (signature1.signerName === signature2.signerName) {
      similarity += 0.3;
    }

    if (signature1.deviceInfo === signature2.deviceInfo) {
      similarity += 0.2;
      suspiciousFactors.push('Mismo dispositivo utilizado');
    }

    if (signature1.ipAddress && signature2.ipAddress && signature1.ipAddress === signature2.ipAddress) {
      similarity += 0.1;
      suspiciousFactors.push('Misma dirección IP');
    }

    // Comparar dimensiones de firma
    const dimensionsSimilar = Math.abs(signature1.metadata.width - signature2.metadata.width) < 50 &&
                             Math.abs(signature1.metadata.height - signature2.metadata.height) < 50;
    if (dimensionsSimilar) {
      similarity += 0.1;
    }

    // Comparar duración de firma (firmas muy similares en tiempo pueden ser sospechosas)
    const durationDiff = Math.abs(signature1.metadata.duration - signature2.metadata.duration);
    if (durationDiff < 1000) { // Menos de 1 segundo de diferencia
      similarity += 0.2;
      suspiciousFactors.push('Duración de firma muy similar');
    }

    // Comparar timestamp (firmas muy cercanas en tiempo pueden ser sospechosas)
    const timeDiff = Math.abs(new Date(signature1.timestamp).getTime() - new Date(signature2.timestamp).getTime());
    if (timeDiff < 60000) { // Menos de 1 minuto
      suspiciousFactors.push('Firmas realizadas muy cerca en tiempo');
    }

    // Determinar recomendación
    let recommendation: 'accept' | 'review' | 'reject' = 'accept';
    
    if (similarity > 0.8 || suspiciousFactors.length > 2) {
      recommendation = 'reject';
    } else if (similarity > 0.5 || suspiciousFactors.length > 0) {
      recommendation = 'review';
    }

    return {
      similarity,
      suspiciousFactors,
      recommendation
    };
  }

  /**
   * Genera un fingerprint simplificado del dispositivo
   */
  private generateDeviceFingerprint(deviceInfo?: string): string {
    if (!deviceInfo) return 'unknown';
    
    // Hash simple del device info
    return this.simpleHash(deviceInfo).substring(0, 8);
  }

  /**
   * Hash simple para entornos sin Web Crypto API
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Exportar instancia singleton
export const digitalSignatureService = new DigitalSignatureService();
export default digitalSignatureService;