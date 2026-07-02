"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-011";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  // beneficiario requerido (RN-004: el seguimiento debe asociarse a un beneficiario)
  beneficiarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un beneficiario")),
  actividad: z.string().trim().min(3, "Actividad: mínimo 3 caracteres").max(400),
  programa: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
  fecha: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  observacion: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(600).optional()),
});

function readForm(fd: FormData) {
  return {
    beneficiarioId: fd.get("beneficiarioId"),
    actividad: String(fd.get("actividad") ?? ""),
    programa: String(fd.get("programa") ?? ""),
    fecha: fd.get("fecha"),
    observacion: String(fd.get("observacion") ?? ""),
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

export async function crearSeguimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  const creado = await prisma.seguimiento.create({
    data: {
      beneficiarioId: d.beneficiarioId,
      programa: d.programa,
      fecha: toDate(d.fecha),
      actividad: d.actividad,
      observacion: d.observacion,
      estado: "Registrado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { beneficiarioId: d.beneficiarioId, actividad: d.actividad, estado: "Registrado" },
  });
  revalidatePath("/seguimiento");
  redirect("/seguimiento");
}

export async function editarSeguimiento(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Seguimiento no válido." };
  const actual = await prisma.seguimiento.findUnique({ where: { id } });
  if (!actual) return { error: "El seguimiento no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  await prisma.seguimiento.update({
    where: { id },
    data: {
      beneficiarioId: d.beneficiarioId,
      programa: d.programa,
      fecha: toDate(d.fecha),
      actividad: d.actividad,
      observacion: d.observacion,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { beneficiarioId: actual.beneficiarioId, actividad: actual.actividad },
    valorNuevo: { beneficiarioId: d.beneficiarioId, actividad: d.actividad },
  });
  revalidatePath("/seguimiento");
  redirect("/seguimiento");
}

// RN-025: MOD-011 no tiene nivel de Aprobación (A) en la matriz de roles; la revisión
// (aprobar/rechazar) exige escritura (E) igual que el registro, pero quien registró el
// seguimiento (createdById) nunca puede aprobar/rechazar su propio registro (4 ojos),
// siguiendo el mismo patrón que revisarDocumento() en MOD-005.
export async function aprobarSeguimiento(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: aprobar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  if (!id) throw new Error("Seguimiento no válido.");
  const actual = await prisma.seguimiento.findUnique({ where: { id } });
  if (!actual) throw new Error("El seguimiento no existe.");
  if (actual.estado !== "Registrado") {
    revalidatePath(`/seguimiento/${id}`);
    redirect(`/seguimiento/${id}`);
  }
  if (actual.createdById && actual.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar un seguimiento que tú registraste.");

  await prisma.seguimiento.update({ where: { id }, data: { estado: "Aprobado" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "aprobar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Registrado" },
    valorNuevo: { estado: "Aprobado" },
  });
  revalidatePath("/seguimiento");
  redirect(`/seguimiento/${id}`);
}

export async function rechazarSeguimiento(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: rechazar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  if (!id) throw new Error("Seguimiento no válido.");
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");

  const actual = await prisma.seguimiento.findUnique({ where: { id } });
  if (!actual) throw new Error("El seguimiento no existe.");
  if (actual.estado !== "Registrado") {
    redirect(`/seguimiento/${id}`);
  }
  if (actual.createdById && actual.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes rechazar un seguimiento que tú registraste.");

  await prisma.seguimiento.update({
    where: { id },
    data: { estado: "Rechazado", observacion: motivo },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "rechazar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Registrado" },
    valorNuevo: { estado: "Rechazado", motivo },
  });
  revalidatePath("/seguimiento");
  redirect(`/seguimiento/${id}`);
}

// Cierre administrativo del seguimiento (fin de ciclo), disponible una vez Aprobado.
export async function cerrarSeguimiento(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cerrar seguimientos requiere escritura (E) en MOD-011. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  if (!id) throw new Error("Seguimiento no válido.");
  const actual = await prisma.seguimiento.findUnique({ where: { id } });
  if (!actual) throw new Error("El seguimiento no existe.");
  if (actual.estado !== "Aprobado") {
    redirect(`/seguimiento/${id}`);
  }

  await prisma.seguimiento.update({ where: { id }, data: { estado: "Cerrado" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "cerrar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Aprobado" },
    valorNuevo: { estado: "Cerrado" },
  });
  revalidatePath("/seguimiento");
  redirect(`/seguimiento/${id}`);
}
