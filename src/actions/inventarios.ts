"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-004";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  codigo: z.string().trim().min(3, "Código requerido (mín. 3 caracteres)").max(40),
  nombre: z.string().trim().min(3, "Nombre requerido (mín. 3 caracteres)").max(160),
  categoria: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(80).optional()),
  ubicacion: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().max(160).optional()),
  cantidad: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z.number().int("La cantidad debe ser un número entero").min(0, "La cantidad no puede ser negativa")
  ),
});

function readForm(fd: FormData) {
  return {
    codigo: String(fd.get("codigo") ?? ""),
    nombre: String(fd.get("nombre") ?? ""),
    categoria: fd.get("categoria"),
    ubicacion: fd.get("ubicacion"),
    cantidad: fd.get("cantidad"),
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

export async function crearItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "crear")))
    return { error: `No autorizado: registrar ítems requiere escritura (E) en MOD-004. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.item.findUnique({ where: { codigo: d.codigo } });
  if (dup) return { fieldErrors: { codigo: "Ya existe un ítem con ese código." } };

  const creado = await prisma.item.create({
    data: {
      codigo: d.codigo,
      nombre: d.nombre,
      categoria: d.categoria ?? null,
      ubicacion: d.ubicacion ?? null,
      cantidad: d.cantidad,
      estado: "Activo",
      createdById: Number(session.user.id),
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creado.id,
    valorNuevo: { codigo: d.codigo, nombre: d.nombre, cantidad: d.cantidad, estado: "Activo" },
  });
  revalidatePath("/inventarios");
  redirect("/inventarios");
}

export async function editarItem(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  if (!(await can(session.user.rol, MOD, "editar")))
    return { error: `No autorizado: editar ítems requiere escritura (E) en MOD-004. Tu rol es ${session.user.rol}.` };

  const id = Number(fd.get("id"));
  if (!id) return { error: "Ítem no válido." };
  const actual = await prisma.item.findUnique({ where: { id } });
  if (!actual) return { error: "El ítem no existe." };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const dup = await prisma.item.findUnique({ where: { codigo: d.codigo } });
  if (dup && dup.id !== id) return { fieldErrors: { codigo: "Otro ítem ya usa ese código." } };

  await prisma.item.update({
    where: { id },
    data: {
      codigo: d.codigo,
      nombre: d.nombre,
      categoria: d.categoria ?? null,
      ubicacion: d.ubicacion ?? null,
      cantidad: d.cantidad,
    },
  });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { codigo: actual.codigo, nombre: actual.nombre, cantidad: actual.cantidad },
    valorNuevo: { codigo: d.codigo, nombre: d.nombre, cantidad: d.cantidad },
  });
  revalidatePath("/inventarios");
  redirect("/inventarios");
}

// RN-002: la eliminación de ítems es una baja lógica (no se borra el registro físicamente).
export async function darDeBajaItem(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "eliminar")))
    throw new Error(`No autorizado: dar de baja un ítem requiere escritura (E) en MOD-004. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const actual = await prisma.item.findUnique({ where: { id } });
  if (!actual) {
    redirect("/inventarios");
  }
  if (actual.estado === "Inactivo") {
    redirect(`/inventarios/${id}`);
  }

  await prisma.item.update({ where: { id }, data: { estado: "Inactivo" } });
  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "baja",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Activo" },
    valorNuevo: { estado: "Inactivo" },
  });
  revalidatePath("/inventarios");
  redirect(`/inventarios/${id}`);
}
