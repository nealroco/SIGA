"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-021";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  tipoEvento: z.string().trim().min(1, "Tipo de evento requerido").max(60),
  canal: z.preprocess((v) => (v === "" || v == null ? "Sistema" : v), z.enum(["Sistema", "Correo", "SMS"])),
  destinatario: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(160).optional()),
  mensaje: z.string().trim().min(3, "Mensaje requerido (mínimo 3 caracteres)").max(2000),
});

function readForm(fd: FormData) {
  return {
    tipoEvento: String(fd.get("tipoEvento") ?? ""),
    canal: fd.get("canal"),
    destinatario: fd.get("destinatario"),
    mensaje: String(fd.get("mensaje") ?? ""),
  };
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function crearNotificacion(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar notificaciones requiere escritura (E) en MOD-021 (roles Administrador/Tecnología). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const creada = await prisma.notificacion.create({
    data: {
      tipoEvento: d.tipoEvento,
      canal: d.canal,
      destinatario: d.destinatario ?? null,
      mensaje: d.mensaje,
      estadoEnvio: "Pendiente",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { tipoEvento: d.tipoEvento, canal: d.canal, estadoEnvio: "Pendiente" } });
  revalidatePath("/notificaciones");
  redirect("/notificaciones");
}

export async function marcarEstadoEnvio(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: actualizar el estado de envío requiere escritura (E) en MOD-021. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const estado = String(fd.get("estado") ?? "");
  if (!id || !["Enviada", "Fallida", "Pendiente"].includes(estado)) {
    revalidatePath("/notificaciones");
    redirect("/notificaciones");
  }

  const actual = await prisma.notificacion.findUnique({ where: { id } });
  if (!actual) {
    revalidatePath("/notificaciones");
    redirect("/notificaciones");
  }

  await prisma.notificacion.update({ where: { id }, data: { estadoEnvio: estado } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "marcar_estado_envio", modulo: MOD, registroId: id, valorAnterior: { estadoEnvio: actual!.estadoEnvio }, valorNuevo: { estadoEnvio: estado } });
  revalidatePath("/notificaciones");
  redirect("/notificaciones");
}
