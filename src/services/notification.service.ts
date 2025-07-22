import { RepairOrder } from '@/types';

// Aquí se podría usar un SDK como @sendgrid/mail o resend

export const notificationService = {
  async sendRepairStatusUpdate(email: string, repairOrder: RepairOrder) {
    const { folio, status, notesForClient } = repairOrder;

    const subject = `Actualización de tu reparación con folio: ${folio}`;
    const text = `Hola, el estado de tu reparación ha cambiado a: ${status}. Notas del técnico: ${notesForClient}`;
    const html = `<p>Hola,</p><p>El estado de tu reparación ha cambiado a: <strong>${status}</strong>.</p><p>Notas del técnico: <em>${notesForClient}</em></p>`;

    console.log(`Enviando email a ${email}: ${subject}`);
    // Aquí iría la lógica para enviar el correo con el SDK elegido
    // Ejemplo: await sgMail.send({ to: email, from: 'taller@example.com', subject, text, html });

    return { success: true };
  },
};
