"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-028";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const ESTADOS = ["Activo", "Inactivo", "Bloqueado"] as const;

export async function cambiarEstadoUsuario(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cambiar el estado de usuarios requiere escritura (E) en MOD-028. Tu rol es ${session.user.rol}.`);

  const usuarioId = Number(fd.get("usuarioId"));
  const nuevoEstado = String(fd.get("nuevoEstado") ?? "");
  if (!usuarioId || !ESTADOS.includes(nuevoEstado as (typeof ESTADOS)[number])) {
    revalidatePath("/admin/usuarios");
    redirect("/admin/usuarios");
  }

  const actual = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!actual) {
    revalidatePath("/admin/usuarios");
    redirect("/admin/usuarios");
  }

  await prisma.usuario.update({ where: { id: usuarioId }, data: { estado: nuevoEstado } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "cambiar_estado_usuario",
    modulo: MOD,
    registroId: usuarioId,
    valorAnterior: { estado: actual!.estado },
    valorNuevo: { estado: nuevoEstado },
  });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

const emergenciaSchema = z.object({
  motivo: z.string().trim().min(5, "El motivo debe tener al menos 5 caracteres"),
});

// RN-026: el acceso de emergencia (break-glass) solo lo puede registrar LITERALMENTE el rol
// Administrador (respaldo de Tecnología), no basta con tener nivel de permiso E en MOD-028.
export async function registrarAccesoEmergencia(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (session.user.rol !== "Administrador")
    return { error: "RN-026: el acceso de emergencia (break-glass) solo lo puede registrar el rol Administrador." };

  const parsed = emergenciaSchema.safeParse({ motivo: String(fd.get("motivo") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const creado = await prisma.accesoEmergenciaIAM.create({
    data: {
      usuarioId: Number(session.user.id),
      motivo: d.motivo,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "acceso_emergencia_iam",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { motivo: d.motivo },
  });
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}
