"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-002";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  documento: z.string().trim().min(5, "Documento: mínimo 5 caracteres").max(20, "Documento demasiado largo"),
  nombre: z.string().trim().min(3, "Nombre requerido").max(120),
  cargo: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(120).optional()),
  perfil: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(200).optional()),
  tipoVinculacion: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["Planta", "Contratista", "OPS"]).optional()
  ),
  fechaIngreso: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  correo: z.preprocess((v) => (v === "" ? undefined : v), z.string().email("Correo no válido").max(120).optional()),
  telefono: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
});

function readForm(fd: FormData) {
  return {
    documento: String(fd.get("documento") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    cargo: String(fd.get("cargo") ?? ""),
    perfil: String(fd.get("perfil") ?? ""),
    tipoVinculacion: fd.get("tipoVinculacion"),
    fechaIngreso: fd.get("fechaIngreso"),
    correo: String(fd.get("correo") ?? ""),
    telefono: String(fd.get("telefono") ?? ""),
  };
}

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function toDate(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function crearPersonal(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  // RN-015: el permiso de rol prevalece (verificación en servidor)
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Personal (MOD-002).` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.personal.findUnique({ where: { documento: d.documento } });
  if (dup) return { fieldErrors: { documento: "Ya existe personal con ese documento." } };

  const data = {
    documento: d.documento,
    nombre: d.nombre,
    cargo: d.cargo,
    perfil: d.perfil,
    tipoVinculacion: d.tipoVinculacion,
    fechaIngreso: toDate(d.fechaIngreso),
    correo: d.correo,
    telefono: d.telefono,
  };

  const creado = await prisma.personal.create({
    data: { ...data, createdById: Number(session.user.id) },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: data,
  });

  revalidatePath("/personal");
  redirect("/personal");
}

export async function editarPersonal(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada. Vuelve a ingresar." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: tu rol (${session.user.rol}) no tiene escritura en Personal (MOD-002).` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Registro no válido." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const anterior = await prisma.personal.findUnique({ where: { id } });
  if (!anterior) return { error: "El registro de personal no existe." };
  if (anterior.estadoAprobacion === "Aprobado")
    return { error: "Una vinculación ya aprobada no puede editarse." };

  const dup = await prisma.personal.findUnique({ where: { documento: d.documento } });
  if (dup && dup.id !== id) return { fieldErrors: { documento: "Otro registro ya usa ese documento." } };

  const data = {
    documento: d.documento,
    nombre: d.nombre,
    cargo: d.cargo,
    perfil: d.perfil,
    tipoVinculacion: d.tipoVinculacion,
    fechaIngreso: toDate(d.fechaIngreso),
    correo: d.correo,
    telefono: d.telefono,
  };

  // tras editar vuelve a Pendiente de aprobación (RN-025)
  await prisma.personal.update({ where: { id }, data: { ...data, estadoAprobacion: "Pendiente", motivoRechazo: null } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: {
      documento: anterior.documento,
      nombre: anterior.nombre,
      cargo: anterior.cargo,
      tipoVinculacion: anterior.tipoVinculacion,
    },
    valorNuevo: data,
  });

  revalidatePath("/personal");
  redirect("/personal");
}

// RN-025: la matriz da nivel Aprobación (A) a Supervisor sobre MOD-002 — quien registró (createdById)
// nunca puede aprobar su propia hoja de vida, aunque además tenga nivel E en otro rol.
export async function aprobarPersonal(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: aprobar vinculaciones de personal requiere nivel Aprobación (A) en MOD-002 (rol Supervisor). Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const p = await prisma.personal.findUnique({ where: { id } });
  if (!p || p.estadoAprobacion !== "Pendiente") {
    revalidatePath(`/personal/${id}`);
    redirect(`/personal/${id}`);
  }
  if (p!.createdById && p!.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes aprobar una hoja de vida que tú mismo registraste.");

  await prisma.personal.update({
    where: { id },
    data: { estadoAprobacion: "Aprobado", aprobadoById: Number(session.user.id), aprobadoEn: new Date(), motivoRechazo: null },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "aprobar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estadoAprobacion: "Pendiente" },
    valorNuevo: { estadoAprobacion: "Aprobado" },
  });
  revalidatePath("/personal");
  redirect(`/personal/${id}`);
}

export async function rechazarPersonal(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "aprobar")))
    throw new Error(`No autorizado: rechazar requiere nivel Aprobación (A) en MOD-002.`);

  const id = Number(fd.get("id"));
  const motivo = String(fd.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Debes indicar un motivo de rechazo.");

  const p = await prisma.personal.findUnique({ where: { id } });
  if (!p || p.estadoAprobacion !== "Pendiente") {
    redirect(`/personal/${id}`);
  }
  if (p!.createdById && p!.createdById === Number(session.user.id))
    throw new Error("Segregación de funciones (RN-025): no puedes rechazar una hoja de vida que tú mismo registraste.");

  await prisma.personal.update({ where: { id }, data: { estadoAprobacion: "Rechazado", motivoRechazo: motivo } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "rechazar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estadoAprobacion: "Pendiente" },
    valorNuevo: { estadoAprobacion: "Rechazado", motivo },
  });
  revalidatePath("/personal");
  redirect(`/personal/${id}`);
}

// RN-002: la "eliminación" es baja lógica (estado = Inactivo), nunca DELETE físico.
export async function darDeBajaPersonal(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) return;
  if (!(await can(session.user.rol, MOD, "eliminar"))) {
    throw new Error("No autorizado para dar de baja personal.");
  }
  const id = Number(fd.get("id"));
  if (!id) return;

  const anterior = await prisma.personal.findUnique({ where: { id } });
  if (!anterior || anterior.estado === "Inactivo") {
    revalidatePath("/personal");
    redirect("/personal");
  }

  await prisma.personal.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });

  revalidatePath("/personal");
  redirect("/personal");
}
