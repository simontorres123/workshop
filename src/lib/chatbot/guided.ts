import { RepairStatus } from '@/types/repair';

export const repairStatusLabels: Record<RepairStatus, string> = {
  pending_diagnosis: 'Pendientes de diagnóstico',
  diagnosis_confirmed: 'Diagnóstico confirmado',
  repair_accepted: 'Reparación aceptada',
  repair_rejected: 'Reparación rechazada',
  in_repair: 'En reparación',
  repaired: 'Reparados',
  delivered: 'Entregados',
  completed: 'Completados',
};

export type GuidedMenu = {
  scope: string;
  canViewCustomer: boolean;
  canViewFinancials: boolean;
  branches: { id: string; name: string }[];
  guides: { id: string; title: string; description: string; steps: string[] }[];
};

export const helpGuides = [
  {
    id: 'create-order', title: 'Registrar una orden', description: 'Cliente, aparato y problema reportado.', financial: false,
    steps: ['Entra a Reparaciones y selecciona Nueva orden con el botón +.', 'Completa los datos obligatorios del cliente, el aparato y el problema. Si eliges Otro en tipo o marca, especifica el nombre.', 'Revisa diagnóstico inicial, costos y condiciones de garantía y almacenamiento. Puedes agregar fotografías del aparato.', 'Selecciona Crear orden. Si falta un dato, utiliza el resumen de validaciones para corregirlo.', 'Una vez creada, abre el comprobante para imprimirlo, solicitar la firma o compartirlo cuando el cliente lo necesite.'],
  },
  {
    id: 'status', title: 'Actualizar el estado', description: 'Consulta y avanza las etapas de una reparación.', financial: false,
    steps: ['En Reparaciones, busca la orden y abre el menú de tres puntos.', 'Selecciona la acción para avanzar el estado y revisa el estado actual y el siguiente paso.', 'Agrega notas cuando corresponda y confirma el cambio.', 'El estado Completado está asociado al cobro; no lo utilices para sustituir el registro de pago.'],
  },
  {
    id: 'parts', title: 'Agregar una refacción', description: 'Materiales, cantidades y existencias.', financial: false,
    steps: ['Confirma primero el diagnóstico de la orden.', 'Abre el detalle de la reparación y busca Refacciones y materiales.', 'Busca la refacción del inventario, indica la cantidad y selecciona Agregar.', 'Revisa la propuesta y utiliza las acciones de reserva o consumo que estén disponibles para esa etapa. Agregar una propuesta no equivale a consumir la pieza.', 'Si no hay existencias suficientes, revisa el inventario antes de reservar o consumir material.'],
  },
  {
    id: 'receipt', title: 'Firma y comprobante', description: 'Imprimir, firmar o compartir con el cliente.', financial: false,
    steps: ['Abre el comprobante desde la orden de reparación.', 'Para firmar en el taller, abre Firma digital y elige la opción de firmar en el momento. Entrega el dispositivo al cliente para que lea y firme.', 'Para firma remota, utiliza la opción de enviar el enlace al celular del cliente.', 'Después de guardar la firma, el comprobante se actualiza. Puedes volver a abrirlo y usar la opción de compartir cuando lo necesites.', 'Imprimir y compartir son opciones; no es obligatorio utilizarlas para guardar la orden.'],
  },
  {
    id: 'charge', title: 'Cobrar una reparación', description: 'Importe, refacciones y método de pago.', financial: true,
    steps: ['Cuando el aparato esté Reparado, abre su menú de acciones y selecciona Cobrar, o entra a Ventas y elige Cobrar reparaciones.', 'Busca el folio y revisa el servicio, las refacciones utilizadas y el importe final.', 'Selecciona el método de pago. El importe recibido y el cambio corresponden únicamente a efectivo.', 'Confirma el cobro una sola vez y espera la confirmación. El sistema registra el pago y actualiza la orden a Completado.', 'Consulta el comprobante y compártelo con el cliente si lo solicita.'],
  },
] as const;

export type GuidedRepair = {
  id: string;
  folio: string;
  status: string;
  device: string;
  createdAt: string;
  branch: string | null;
  customer?: string;
};

export type GuidedDetail = GuidedRepair & {
  problem: string;
  diagnosis: string | null;
  warrantyMonths: number;
  storageMonths: number;
  history: { status: string; date: string }[];
  payment?: { amount: number; method: string; date: string } | null;
};

export type GuidedList = { orders: GuidedRepair[]; total: number; page: number; pageSize: number };
