"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-026";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const schema = z.object({
  modulo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(20).optional()),
  descripcion: z.string().trim().min(5, "Descripción requerida (mínimo 5 caracteres)").max(2000),
  gravedad: z.preprocess(
    (v) => (v === "" || v == null ? "Media" : v),
    z.enum(["Baja", "Media", "Alta"])
  ),
});

export async function crearHallazgo(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar hallazgos requiere escritura (E) en MOD-026 (roles Supervisor/Revisor). Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse({
    modulo: fd.get("modulo"),
    descripcion: fd.get("descripcion"),
    gravedad: fd.get("gravedad"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const creado = await prisma.hallazgoAuditoria.create({
    data: {
      modulo: d.modulo ?? null,
      descripcion: d.descripcion,
      gravedad: d.gravedad,
      estado: "Abierto",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "crear", modulo: MOD, registroId: creado.id, valorNuevo: { modulo: d.modulo, gravedad: d.gravedad, estado: "Abierto" } });
  revalidatePath("/auditoria");
  redirect("/auditoria");
}

export async function cerrarHallazgo(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: cerrar hallazgos requiere escritura (E) en MOD-026. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const h = await prisma.hallazgoAuditoria.findUnique({ where: { id } });
  if (!h || h.estado !== "Abierto") {
    revalidatePath("/auditoria");
    redirect("/auditoria");
  }

  await prisma.hallazgoAuditoria.update({ where: { id }, data: { estado: "Cerrado" } });
  await writeAudit({ usuarioId: Number(session.user.id), accion: "cerrar", modulo: MOD, registroId: id, valorAnterior: { estado: "Abierto" }, valorNuevo: { estado: "Cerrado" } });
  revalidatePath("/auditoria");
  redirect("/auditoria");
}
