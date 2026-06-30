import { prisma } from "@/lib/db";

type AuditInput = {
  usuarioId?: number | null;
  accion: string; // crear | editar | baja | login
  modulo: string; // MOD-001
  registroId?: string | number | null;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  ip?: string | null;
};

/** RN-014: registra toda acción crítica en la bitácora de auditoría. */
export async function writeAudit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      usuarioId: input.usuarioId ?? null,
      accion: input.accion,
      modulo: input.modulo,
      registroId: input.registroId != null ? String(input.registroId) : null,
      valorAnterior: input.valorAnterior != null ? JSON.stringify(input.valorAnterior) : null,
      valorNuevo: input.valorNuevo != null ? JSON.stringify(input.valorNuevo) : null,
      ip: input.ip ?? null,
    },
  });
}
