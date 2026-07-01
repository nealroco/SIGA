"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-015";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  tema: z.string().trim().min(3, "Tema requerido (mínimo 3 caracteres)").max(300),
  decision: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(2000).optional()),
  fecha: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
});

function readForm(fd: FormData) {
  return {
    tema: String(fd.get("tema") ?? ""),
    decision: fd.get("decision"),
    fecha: fd.get("fecha"),
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

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function crearActa(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar actas requiere escritura (E) en MOD-015 (rol Supervisor o Coord. deportiva). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const fecha = toDate(d.fecha);

  const creada = await prisma.actaComite.create({
    data: {
      tema: d.tema,
      decision: d.decision ?? null,
      fecha: fecha ?? undefined,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { tema: d.tema, estado: "Registrada" } });
  // RN-025: doble control — notificar al aprobador que hay un acta pendiente de aprobación
  await prisma.notificacion.create({
    data: {
      tipoEvento: "RN-025",
      canal: "Sistema",
      destinatario: "Administrador",
      mensaje: `El acta de comité #${creada.id} sobre "${d.tema}" quedó pendiente de aprobación.`,
      estadoEnvio: "Pendiente",
      createdById: Number(session.user.id),
    },
  });
  revalidatePath("/comite");
  redirect("/comite");
}

export async function editarActa(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar actas requiere escritura (E) en MOD-015. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Acta no válida." };
  const actual = await prisma.actaComite.findUnique({ where: { id } });
  if (!actual) return { error: "El acta no existe." };
  if (actual.estado !== "Registrada" && actual.estado !== "Rechazada")
    return { error: "Solo se pueden editar actas en estado Registrada o Rechazada." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const fecha = toDate(d.fecha);

  await prisma.actaComite.update({
    where: { id },
    data: {
      tema: d.tema,
      decision: d.decision ?? null,
      fecha: fecha ?? undefined,
      estado: "Registrada", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { tema: d.tema } });
  revalidatePath("/comite");
  redirect("/comite");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien registró el acta (4 ojos)
export async function aprobarActa(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar actas requiere nivel Aprobación (A) en MOD-015. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const acta = await prisma.actaComite.findUnique({ where: { id } });
  if (!acta || acta.estado !== "Registrada") {
    revalidatePath(`/comite/${id}`);
    redirect(`/comite/${id}`);
  }
  if (acta.createdById && acta.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar un acta que tú registraste.");

  await prisma.actaComite.update({
    where: { id },
    data: { estado: "Aprobada", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrada" }, valorNuevo: { estado: "Aprobada" } });
  revalidatePath("/comite");
  redirect(`/comite/${id}`);
}

export async function rechazarActa(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-015.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");

  const acta = await prisma.actaComite.findUnique({ where: { id } });
  if (!acta || acta.estado !== "Registrada") {
    redirect(`/comite/${id}`);
  }

  await prisma.actaComite.update({ where: { id }, data: { estado: "Rechazada", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazada", motivo } });
  revalidatePath("/comite");
  redirect(`/comite/${id}`);
}
