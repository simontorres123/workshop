import { resend } from '@/lib/resend';

export const emailService = {
  /**
   * Envía un correo de bienvenida e invitación a un nuevo organizador
   */
  sendOrganizerInvitation: async (params: {
    email: string;
    fullName: string;
    orgName: string;
    invitationLink: string;
    temporaryPassword?: string;
  }) => {
    try {
      const passwordSection = params.temporaryPassword
        ? `
            <div style="background-color: #FFF3E0; border: 1px solid #FFB74D; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #E65100;">Tu contraseña temporal:</p>
              <p style="margin: 0; font-family: monospace; font-size: 18px; letter-spacing: 1px; color: #333;">${params.temporaryPassword}</p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Usa esta contraseña para iniciar sesión con tu correo electrónico. Te recomendamos cambiarla al ingresar.</p>
            </div>`
        : '';

      const { data, error } = await resend.emails.send({
        from: 'Workshop Pro <onboarding@resend.dev>', // Cambiar por dominio verificado en prod
        to: [params.email],
        subject: `¡Bienvenido a Workshop Pro, ${params.fullName}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #00A76F;">¡Hola, ${params.fullName}!</h2>
            <p>Has sido dado de alta como <strong>Organizador</strong> para el taller <strong>${params.orgName}</strong> en nuestra plataforma.</p>
            <p>Para completar la configuración de tu cuenta y acceder a tu panel de control, haz clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.invitationLink}" style="background-color: #00A76F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Configurar mi cuenta y entrar
              </a>
            </div>
            ${passwordSection}
            <p style="color: #666; font-size: 14px;">También puedes entrar con el enlace de arriba (acceso automático) o usando tu correo y contraseña temporal.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px; text-align: center;">Workshop Pro - El sistema líder para gestión de reparaciones.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Error sending email via Resend:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Unexpected error in emailService:', err);
      return { success: false, error: err };
    }
  }
};
