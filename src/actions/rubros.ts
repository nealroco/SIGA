"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-003";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  codigo: z.string().trim().min(3, "Código requerido (mín. 3 caracteres)").max(40),
  nombre: z.string().trim().min(3, "Nombre requerido (mín. 3 caracteres)").max(160),
  fuenteId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona una fuente")),
  // RN-023: la meta de inversión no puede ser negativa
  valorAsignado: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "La meta de inversión no puede ser negativa")
  ),
  vigencia: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(20).optional()),
});

function readForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    fuenteId: fd.get("fuenteId"),
    valorAsignado: fd.get("valorAsignado"),
    vigencia: fd.get("vigencia"),
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

// La meta de inversión del rubro no puede exceder lo aún libre de su fuente.
async function validarContraFuente(fuenteId: number, valorAsignado: number, rubroIdExcluir?: number) {
  const fuente = await prisma.fuenteFinanciacion.findUnique({ where: { id: fuenteId } });
  if (!fuente || fuente.estado !== "Aprobada") return "RN-007: el rubro debe imputarse a una fuente Aprobada.";
  const otrosRubros = await prisma.rubro.findMany({
    where: { fuenteId, estado: "Aprobado", ...(rubroIdExcluir ? { id: { not: rubroIdExcluir } } : {}) },
    select: { valorAsignado: true },
  });
  const comprometidoFuente = otrosRubros.reduce((acc, r) => acc + r.valorAsignado, 0);
  if (comprometidoFuente + valorAsignado > fuente.valorDisponible)
    return `La meta de inversión supera el saldo libre de la fuente (disponible: ${fuente.valorDisponible - comprometidoFuente}).`;
  return null;
}

export async function crearRubro(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: proponer rubros requiere escritura (E) en MOD-003 (rol Financiera). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.rubro.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe un rubro con ese código." } };

  const errFuente = await validarContraFuente(d.fuenteId, d.valorAsignado);
  if (errFuente) return { error: errFuente };

  const creado = await prisma.rubro.create({
    data: { codigo: d.codigo, nombre: d.nombre, fuenteId: d.fuenteId, valorAsignado: d.valorAsignado, vigencia: d.vigencia, estado: "Registrado", createdById: Number(session.user.id) },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear_rubro", modulo: MOD, registroId: creado.id, valorNuevo: { codigo: d.codigo, valorAsignado: d.valorAsignado, estado: "Registrado" } });
  // RN-025: doble control — notificar al aprobador que hay un rubro pendiente de aprobación
  await prisma.notificacion.create({
    data: {
      tipoEvento: "RN-025",
      canal: "Sistema",
      destinatario: "Administrador",
      mensaje: `El rubro ${d.codigo} quedó pendiente de aprobación.`,
      estadoEnvio: "Pendiente",
      createdById: Number(session.user.id),
    },
  });
  revalidatePath("/rubros");
  redirect("/rubros");
}

export async function editarRubro(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar rubros requiere escritura (E) en MOD-003. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Rubro no válido." };
  const actual = await prisma.rubro.findUnique({ where: { id } });
  if (!actual) return { error: "El rubro no existe." };
  if (actual.estado === "Aprobado") return { error: "Un rubro aprobado no puede editarse." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.rubro.findUnique({ where: { codigo: d.codigo } });
  if (dup && dup.id !== id) return { fieldErrors: { codigo: "Otro rubro ya usa ese código." } };

  const errFuente = await validarContraFuente(d.fuenteId, d.valorAsignado, id);
  if (errFuente) return { error: errFuente };

  await prisma.rubro.update({
    where: { id },
    data: { codigo: d.codigo, nombre: d.nombre, fuenteId: d.fuenteId, valorAsignado: d.valorAsignado, vigencia: d.vigencia, estado: "Registrado", motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar_rubro", modulo: MOD, registroId: id, valorNuevo: { codigo: d.codigo, valorAsignado: d.valorAsignado } });
  revalidatePath("/rubros");
  redirect("/rubros");
}

// RN-025: solo nivel Aprobación (A) aprueba la meta de inversión, y nunca quien la propuso (4 ojos)
export async function aprobarRubro(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar la meta de inversión de un rubro requiere nivel Aprobación (A) en MOD-003. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const r = await prisma.rubro.findUnique({ where: { id } });
  if (!r || r.estado !== "Registrado") {
    revalidatePath(`/rubros/${id}`);
    redirect(`/rubros/${id}`);
  }
  if (r.createdById && r.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar la meta de inversión de un rubro que tú mismo propusiste.");

  const errFuente = await validarContraFuente(r.fuenteId, r.valorAsignado, r.id);
  if (errFuente) throw new Error(errFuente);

  await prisma.rubro.update({
    where: { id },
    data: { estado: "Aprobado", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar_rubro", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrado" }, valorNuevo: { estado: "Aprobado" } });
  revalidatePath("/rubros");
  redirect(`/rubros/${id}`);
}

export async function rechazarRubro(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-003.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim() || "Sin motivo especificado";
  const r = await prisma.rubro.findUnique({ where: { id } });
  if (!r || r.estado !== "Registrado") {
    redirect(`/rubros/${id}`);
  }

  await prisma.rubro.update({ where: { id }, data: { estado: "Rechazado", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar_rubro", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazado", motivo } });
  revalidatePath("/rubros");
  redirect(`/rubros/${id}`);
}
