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
  }) => {
    try {
      const { data, error } = await resend.emails.send({
        from: 'Workshop Pro <onboarding@resend.dev>', // Cambiar por dominio verificado en prod
        to: [params.email],
        subject: `¡Bienvenido a Workshop Pro, ${params.fullName}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #667eea;">¡Hola, ${params.fullName}!</h2>
            <p>Has sido dado de alta como <strong>Organizador</strong> para el taller <strong>${params.orgName}</strong> en nuestra plataforma.</p>
            <p>Para completar la configuración de tu cuenta y acceder a tu panel de control, haz clic en el siguiente botón:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.invitationLink}" style="background-color: #667eea; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Configurar mi cuenta y entrar
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Este enlace te permitirá entrar automáticamente y te recomendamos cambiar tu contraseña al ingresar en la sección de Mi Perfil.</p>
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
