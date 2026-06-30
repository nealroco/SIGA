"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-020";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  codigo: z.string().trim().min(3, "Código requerido (mín. 3 caracteres)").max(40),
  nombre: z.string().trim().min(3, "Nombre requerido (mín. 3 caracteres)").max(160),
  tipo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(40).optional()),
  // RN-023: el valor disponible no puede ser negativo
  valorDisponible: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().min(0, "El valor disponible no puede ser negativo")
  ),
  vigencia: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(20).optional()),
});

function readForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    tipo: fd.get("tipo"),
    valorDisponible: fd.get("valorDisponible"),
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

export async function crearFuente(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar fuentes de financiación requiere escritura (E) en MOD-020 (rol Financiera). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.fuenteFinanciacion.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe una fuente con ese código." } };

  const creada = await prisma.fuenteFinanciacion.create({
    data: {
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      valorDisponible: d.valorDisponible,
      vigencia: d.vigencia,
      estado: "Registrada",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { codigo: d.codigo, valorDisponible: d.valorDisponible, estado: "Registrada" } });
  revalidatePath("/fuentes");
  redirect("/fuentes");
}

export async function editarFuente(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar fuentes de financiación requiere escritura (E) en MOD-020. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Fuente no válida." };
  const actual = await prisma.fuenteFinanciacion.findUnique({ where: { id } });
  if (!actual) return { error: "La fuente no existe." };
  if (actual.estado === "Aprobada")
    return { error: "Una fuente aprobada no puede editarse." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.fuenteFinanciacion.findUnique({ where: { codigo: d.codigo } });
  if (dup && dup.id !== id) return { fieldErrors: { codigo: "Otra fuente ya usa ese código." } };

  await prisma.fuenteFinanciacion.update({
    where: { id },
    data: {
      codigo: d.codigo,
      nombre: d.nombre,
      tipo: d.tipo,
      valorDisponible: d.valorDisponible,
      vigencia: d.vigencia,
      estado: "Registrada", // tras editar vuelve a pendiente de aprobación
      motivoRechazo: null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { codigo: d.codigo, valorDisponible: d.valorDisponible } });
  revalidatePath("/fuentes");
  redirect("/fuentes");
}

// RN-025: solo un rol con Aprobación (A) puede aprobar, y nunca quien lo registró (4 ojos)
export async function aprobarFuente(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar fuentes de financiación requiere nivel Aprobación (A) en MOD-020. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const f = await prisma.fuenteFinanciacion.findUnique({ where: { id } });
  if (!f || f.estado !== "Registrada") {
    revalidatePath(`/fuentes/${id}`);
    redirect(`/fuentes/${id}`);
  }
  if (f.createdById && f.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

  await prisma.fuenteFinanciacion.update({
    where: { id },
    data: { estado: "Aprobada", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "aprobar", modulo: MOD, registroId: id, valorAnterior: { estado: "Registrada" }, valorNuevo: { estado: "Aprobada" } });
  revalidatePath("/fuentes");
  redirect(`/fuentes/${id}`);
}

export async function rechazarFuente(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-020.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");

  const f = await prisma.fuenteFinanciacion.findUnique({ where: { id } });
  if (!f || f.estado !== "Registrada") {
    redirect(`/fuentes/${id}`);
  }
  if (f.createdById && f.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar lo que tú registraste.");

  await prisma.fuenteFinanciacion.update({ where: { id }, data: { estado: "Rechazada", motivoRechazo: motivo } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "rechazar", modulo: MOD, registroId: id, valorNuevo: { estado: "Rechazada", motivo } });
  revalidatePath("/fuentes");
  redirect(`/fuentes/${id}`);
}
