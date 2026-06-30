"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-029";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  clave: z.string().trim().min(1, "Clave requerida"),
  nuevoValor: z.string().trim().min(1, "El valor no puede estar vacío").max(500, "Valor demasiado largo"),
});

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function actualizarConfiguracionCloud(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: actualizar la configuración cloud requiere escritura (E) en MOD-029 (roles Administrador / Tecnología). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse({
    clave: fd.get("clave"),
    nuevoValor: fd.get("nuevoValor"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const actual = await prisma.configuracionCloud.findUnique({ where: { clave: d.clave } });
  if (!actual) return { error: "La configuración no existe." };

  await prisma.configuracionCloud.update({
    where: { clave: d.clave },
    data: { valor: d.nuevoValor, actualizadoById: Number(session.user.id) },
  });

  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "actualizar_config_cloud",
    modulo: MOD,
    registroId: d.clave,
    valorAnterior: { valor: actual.valor },
    valorNuevo: { valor: d.nuevoValor },
  });

  revalidatePath("/infraestructura-cloud");
  return { ok: true };
}
