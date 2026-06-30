"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-027";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  // RN-004: el registro SECOP debe asociarse a un contrato existente
  contratoId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un contrato")),
  procesoSecop: z.string().trim().min(3, "Proceso SECOP: mínimo 3 caracteres (ej. CO1.BDOS.1234567)").max(60),
});

function readForm(fd: FormData) {
  return {
    contratoId: fd.get("contratoId"),
    procesoSecop: String(fd.get("procesoSecop") ?? ""),
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

export async function crearRegistroSecop(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar en SECOP II requiere escritura (E) en MOD-027. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const contrato = await prisma.contrato.findUnique({ where: { id: d.contratoId } });
  if (!contrato) return { fieldErrors: { contratoId: "El contrato seleccionado no existe." } };

  const creado = await prisma.registroSecop.create({
    data: {
      contratoId: d.contratoId,
      procesoSecop: d.procesoSecop,
      estadoSync: "Registrado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { contratoId: d.contratoId, procesoSecop: d.procesoSecop, estadoSync: "Registrado" } });
  revalidatePath("/secop");
  redirect("/secop");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien lo registró (4 ojos)
export async function aprobarRegistroSecop(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar registros SECOP requiere nivel Aprobación (A) en MOD-027. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const r = await prisma.registroSecop.findUnique({ where: { id } });
  if (!r || r.estadoSync !== "Registrado") {
    revalidatePath(`/secop/${id}`);
    redirect(`/secop/${id}`);
  }
  if (r.createdById && r.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

  await prisma.registroSecop.update({
    where: { id },
    data: { estadoSync: "Aprobado", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estadoSync: "Registrado" }, valorNuevo: { estadoSync: "Aprobado" } });
  revalidatePath("/secop");
  redirect(`/secop/${id}`);
}

export async function rechazarRegistroSecop(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-027.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim() || "Sin motivo especificado";
  const r = await prisma.registroSecop.findUnique({ where: { id } });
  if (!r || r.estadoSync !== "Registrado") {
    redirect(`/secop/${id}`);
  }

  await prisma.registroSecop.update({ where: { id }, data: { estadoSync: "Rechazado", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estadoSync: "Rechazado", motivo } });
  revalidatePath("/secop");
  redirect(`/secop/${id}`);
}

// Simula la sincronización con SECOP II (sin llamada externa real)
export async function sincronizarRegistroSecop(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: sincronizar requiere escritura (E) en MOD-027. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const r = await prisma.registroSecop.findUnique({ where: { id } });
  if (!r || r.estadoSync !== "Aprobado") {
    redirect(`/secop/${id}`);
  }

  await prisma.registroSecop.update({ where: { id }, data: { estadoSync: "Sincronizado" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "sincronizar", modulo: MOD, registroId: id, valorAnterior: { estadoSync: "Aprobado" }, valorNuevo: { estadoSync: "Sincronizado" } });
  revalidatePath("/secop");
  redirect(`/secop/${id}`);
}
