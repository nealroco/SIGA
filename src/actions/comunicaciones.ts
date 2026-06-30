"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-019";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  tipo: z.enum(["Interna", "Externa", "Prensa"], { message: "Selecciona un tipo válido" }),
  canal: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["Correo", "WhatsApp", "Boletín", "Redes"]).optional()
  ),
  asunto: z.string().trim().min(3, "Asunto requerido (mínimo 3 caracteres)").max(200),
  contenido: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
  publico: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(200).optional()),
});

function readForm(fd: FormData) {
  return {
    tipo: fd.get("tipo"),
    canal: fd.get("canal"),
    asunto: String(fd.get("asunto") ?? ""),
    contenido: fd.get("contenido"),
    publico: fd.get("publico"),
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

export async function crearComunicacion(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar comunicaciones requiere escritura (E) en MOD-019. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const creada = await prisma.comunicacion.create({
    data: {
      tipo: d.tipo,
      canal: d.canal ?? null,
      asunto: d.asunto,
      contenido: d.contenido ?? null,
      publico: d.publico ?? null,
      estado: "Borrador",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creada.id, valorNuevo: { tipo: d.tipo, canal: d.canal, asunto: d.asunto, estado: "Borrador" } });
  revalidatePath("/comunicaciones");
  redirect("/comunicaciones");
}

export async function editarComunicacion(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar comunicaciones requiere escritura (E) en MOD-019. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Comunicación no válida." };
  const actual = await prisma.comunicacion.findUnique({ where: { id } });
  if (!actual) return { error: "La comunicación no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  await prisma.comunicacion.update({
    where: { id },
    data: {
      tipo: d.tipo,
      canal: d.canal ?? null,
      asunto: d.asunto,
      contenido: d.contenido ?? null,
      publico: d.publico ?? null,
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "editar", modulo: MOD, registroId: id, valorNuevo: { tipo: d.tipo, canal: d.canal, asunto: d.asunto } });
  revalidatePath("/comunicaciones");
  redirect(`/comunicaciones/${id}`);
}

export async function marcarEnviada(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: marcar como enviada requiere escritura (E) en MOD-019. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const c = await prisma.comunicacion.findUnique({ where: { id } });
  if (!c || c.estado !== "Borrador") {
    revalidatePath(`/comunicaciones/${id}`);
    redirect(`/comunicaciones/${id}`);
  }

  await prisma.comunicacion.update({ where: { id }, data: { estado: "Enviada" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "enviar", modulo: MOD, registroId: id, valorAnterior: { estado: "Borrador" }, valorNuevo: { estado: "Enviada" } });
  revalidatePath("/comunicaciones");
  redirect(`/comunicaciones/${id}`);
}
