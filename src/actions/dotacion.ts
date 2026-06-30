"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

const MOD = "MOD-013";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

const schema = z.object({
  beneficiarioId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un beneficiario")),
  itemId: z.preprocess((v) => Number(v), z.number().int().positive("Selecciona un ítem")),
  cantidad: z.preprocess(
    (v) => (v === "" || v == null ? 1 : Number(v)),
    z.number().int("La cantidad debe ser un entero").min(1, "La cantidad debe ser al menos 1")
  ),
});

function readForm(fd: FormData) {
  return {
    beneficiarioId: fd.get("beneficiarioId"),
    itemId: fd.get("itemId"),
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

export async function crearEntrega(_prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión expirada." };
  const puedeCrear = await can(session.user.rol, MOD, "crear");
  const puedeCargar = await can(session.user.rol, MOD, "cargar");
  if (!puedeCrear && !puedeCargar)
    return { error: `No autorizado: registrar entregas de dotación requiere escritura (E) o carga (C) en MOD-013. Tu rol es ${session.user.rol}.` };

  const parsed = schema.safeParse(readForm(fd));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
  const d = parsed.data;

  const beneficiario = await prisma.beneficiario.findUnique({ where: { id: d.beneficiarioId } });
  if (!beneficiario) return { fieldErrors: { beneficiarioId: "El beneficiario no existe." } };

  const item = await prisma.item.findUnique({ where: { id: d.itemId } });
  if (!item) return { fieldErrors: { itemId: "El ítem no existe." } };

  // Verifica stock disponible antes de entregar.
  if (item.cantidad < d.cantidad) return { error: "Sin stock suficiente." };

  const creada = await prisma.$transaction(async (tx) => {
    const entrega = await tx.dotacionEntrega.create({
      data: {
        beneficiarioId: d.beneficiarioId,
        itemId: d.itemId,
        cantidad: d.cantidad,
        estado: "Entregada",
        createdById: Number(session.user.id),
      },
    });
    await tx.item.update({
      where: { id: d.itemId },
      data: { cantidad: { decrement: d.cantidad } },
    });
    return entrega;
  });

  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "crear",
    modulo: MOD,
    registroId: creada.id,
    valorNuevo: { beneficiarioId: d.beneficiarioId, itemId: d.itemId, cantidad: d.cantidad, estado: "Entregada" },
  });
  revalidatePath("/dotacion");
  redirect("/dotacion");
}

export async function marcarDevuelta(fd: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Sesión expirada.");
  if (!(await can(session.user.rol, MOD, "editar")))
    throw new Error(`No autorizado: marcar como devuelta requiere escritura (E) en MOD-013. Tu rol es ${session.user.rol}.`);

  const id = Number(fd.get("id"));
  const entrega = await prisma.dotacionEntrega.findUnique({ where: { id } });
  if (!entrega) {
    redirect("/dotacion");
  }
  if (entrega.estado !== "Entregada") {
    redirect(`/dotacion/${id}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.dotacionEntrega.update({ where: { id }, data: { estado: "Devuelta" } });
    await tx.item.update({
      where: { id: entrega.itemId },
      data: { cantidad: { increment: entrega.cantidad } },
    });
  });

  await writeAudit({
    usuarioId: Number(session.user.id),
    accion: "editar",
    modulo: MOD,
    registroId: id,
    valorAnterior: { estado: "Entregada" },
    valorNuevo: { estado: "Devuelta" },
  });
  revalidatePath("/dotacion");
  redirect(`/dotacion/${id}`);
}
