import { Scale, TrendingUp, FileSignature, CheckCircle2, FolderCheck, FolderClock, FolderX, type LucideIcon } from "lucide-react";

export type Tono = "ok" | "warn" | "info" | "bad";
export type Insight = { icon: LucideIcon; tono: Tono; titulo: string; cuerpo: string; href?: string };

export type InsightsInput = {
  porPrograma: { programa: string | null; count: number }[];
  contratosPendientes: number;
  pctDocumental: number;
  docsAprobados: number;
  docsTotal: number;
};

/**
 * 3 insights calculados con reglas simples sobre datos reales — sin IA generativa,
 * sin texto inventado. Cada regla queda documentada aquí para que sea auditable.
 */
export function buildInsights(data: InsightsInput): Insight[] {
  const insights: Insight[] = [];

  // 1. Distribución por programa: uniforme si la diferencia entre el programa con
  // más y el de menos beneficiarios activos es de a lo sumo 1.
  if (data.porPrograma.length > 0) {
    const counts = data.porPrograma.map((p) => p.count);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const uniforme = data.porPrograma.length <= 1 || max - min <= 1;
    if (uniforme) {
      insights.push({
        icon: Scale,
        tono: "ok",
        titulo: "Distribución equilibrada",
        cuerpo: `Los ${data.porPrograma.length} programas activos tienen una participación similar (máx. ${max}, mín. ${min}).`,
      });
    } else {
      const top = data.porPrograma.reduce((a, b) => (b.count > a.count ? b : a));
      const total = counts.reduce((a, b) => a + b, 0);
      insights.push({
        icon: TrendingUp,
        tono: "info",
        titulo: `Concentración en ${top.programa ?? "sin programa"}`,
        cuerpo: `${top.count} de ${total} beneficiarios activos están en este programa.`,
      });
    }
  }

  // 2. Contratos pendientes de aprobación (RN-025).
  if (data.contratosPendientes > 0) {
    insights.push({
      icon: FileSignature,
      tono: "warn",
      titulo: `${data.contratosPendientes} contrato${data.contratosPendientes === 1 ? "" : "s"} esperan aprobación`,
      cuerpo: "Requieren revisión en el módulo de Contratos (MOD-010).",
      href: "/contratos",
    });
  } else {
    insights.push({
      icon: CheckCircle2,
      tono: "ok",
      titulo: "Sin contratos pendientes",
      cuerpo: "Todos los contratos registrados están aprobados o cerrados.",
    });
  }

  // 3. Expediente documental: bandas fijas, sin ajustar para que se vea mejor.
  if (data.pctDocumental >= 80) {
    insights.push({
      icon: FolderCheck,
      tono: "ok",
      titulo: "Documentación saludable",
      cuerpo: `${data.docsAprobados} de ${data.docsTotal} documentos aprobados (${data.pctDocumental}%).`,
    });
  } else if (data.pctDocumental >= 50) {
    insights.push({
      icon: FolderClock,
      tono: "info",
      titulo: "Documentación en progreso",
      cuerpo: `${data.docsAprobados} de ${data.docsTotal} documentos aprobados (${data.pctDocumental}%).`,
    });
  } else {
    insights.push({
      icon: FolderX,
      tono: "warn",
      titulo: "Expediente documental incompleto",
      cuerpo: `Solo ${data.docsAprobados} de ${data.docsTotal} documentos aprobados (${data.pctDocumental}%).`,
    });
  }

  return insights;
}
