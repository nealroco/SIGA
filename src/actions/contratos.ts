"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-010";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  numero: z.string().trim().min(3, "Número requerido").max(40),
  objeto: z.string().trim().min(3, "Objeto requerido").max(400),
  // RN-004: el contrato debe estar asociado a un tercero
  terceroId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un tercero")),
  // RN-020: los valores monetarios no pueden ser negativos
  valorTotal: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El valor no puede ser negativo")
  ),
  fechaInicio: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  fechaFin: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  supervisor: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
});

function readForm(fd: FormData) {
  return {
    numero: String(fd.get("numero") ?? ""),
    objeto: String(fd.get("objeto") ?? ""),
    terceroId: fd.get("terceroId"),
    valorTotal: fd.get("valorTotal"),
    fechaInicio: fd.get("fechaInicio"),
    fechaFin: fd.get("fechaFin"),
    supervisor: String(fd.get("supervisor") ?? ""),
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

export async function crearContrato(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar contratos requiere escritura (E) en MOD-010 (rol Financiera). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const ini = toDate(d.fechaInicio);
  const fin = toDate(d.fechaFin);
  if (ini && fin && fin <= ini) return { fieldErrors: { fechaFin: "La fecha fin debe ser posterior a la de inicio." } };

  const dup = await prisma.contrato.findUnique({ where: { numero: d.numero } });
  if (dup) return { fieldErrors: { numero: "Ya existe un contrato con ese número." } };

  const creado = await prisma.contrato.create({
    data: {
      numero: d.numero,
      objeto: d.objeto,
      terceroId: d.terceroId,
      valorTotal: d.valorTotal,
      fechaInicio: ini,
      fechaFin: fin,
      supervisor: d.supervisor,
      estado: "Registrado",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { numero: d.numero, valorTotal: d.valorTotal, estado: "Registrado" } });
  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function editarContrato(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar contratos requiere escritura (E) en MOD-010. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Contrato no válido." };
  const actual = await prisma.contrato.findUnique({ where: { id } });
  if (!actual) return { error: "El contrato no existe." };
  if (actual.estado === "Aprobado" || actual.estado === "Cerrado")
    return { error: "Un contrato aprobado o cerrado no puede editarse." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const ini = toDate(d.fechaInicio);
  const fin = toDate(d.fechaFin);
  if (ini && fin && fin <= ini) return { fieldErrors: { fechaFin: "La fecha fin debe ser posterior a la de inicio." } };

  const dup = await prisma.contrato.findUnique({ where: { numero: d.numero } });
  if (dup && dup.id !== id) return { fieldErrors: { numero: "Otro contrato ya usa ese número." } };

  await prisma.contrato.update({
    where: { id },
    data: {
      numero: d.numero,
      objeto: d.objeto,
      terceroId: d.terceroId,
      valorTotal: d.valorTotal,
      fechaInicio: ini,
      fechaFin: fin,
      supervisor: d.supervisor,
      estado: "Registrado", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { numero: d.numero, valorTotal: d.valorTotal } });
  revalidatePath("/contratos");
  redirect("/contratos");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien lo registró (4 ojos)
export async function aprobarContrato(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar contratos requiere nivel Aprobación (A) en MOD-010. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const c = await prisma.contrato.findUnique({ where: { id } });
  if (!c || c.estado !== "Registrado") {
    revalidatePath(`/contratos/${id}`);
    redirect(`/contratos/${id}`);
  }
  if (c.createdById && c.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar un contrato que tú registraste.");

  await prisma.contrato.update({
    where: { id },
    data: { estado: "Aprobado", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrado" }, valorNuevo: { estado: "Aprobado" } });
  revalidatePath("/contratos");
  redirect(`/contratos/${id}`);
}

export async function rechazarContrato(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-010.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim() || "Sin motivo especificado";
  const c = await prisma.contrato.findUnique({ where: { id } });
  if (!c || c.estado !== "Registrado") {
    redirect(`/contratos/${id}`);
  }

  await prisma.contrato.update({ where: { id }, data: { estado: "Rechazado", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazado", motivo } });
  revalidatePath("/contratos");
  redirect(`/contratos/${id}`);
}

export async function cerrarContrato(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: cerrar requiere nivel Aprobación (A) en MOD-010.`);

  const id = Number(fd.get("id"));
  const c = await prisma.contrato.findUnique({ where: { id } });
  if (!c || c.estado !== "Aprobado") {
    redirect(`/contratos/${id}`);
  }
  // RN-013 (pendiente): aquí se verificará el expediente documental completo cuando exista MOD-005.
  await prisma.contrato.update({ where: { id }, data: { estado: "Cerrado" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "cerrar", modulo: MOD, registroId: id, valorAnterior: { estado: "Aprobado" }, valorNuevo: { estado: "Cerrado" } });
  revalidatePath("/contratos");
  redirect(`/contratos/${id}`);
}
