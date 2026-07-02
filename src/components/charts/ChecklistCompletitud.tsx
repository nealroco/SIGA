import type { DocumentoPorcentaje } from "@/lib/estadisticasBeneficiarios";

/** Reusa `.progress-bar`/`.progress-scale` ya definidos en globals.css (mismo patrón que el
 *  KPI de "% ejecución financiera" del dashboard) — una barra por documento de la ficha. */
export default function ChecklistCompletitud({ data }: { data: DocumentoPorcentaje[] }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <p className="section-cap" style={{ marginTop: 0 }}>Completitud por documento</p>
      <div style={{ display: "grid", gap: 14 }}>
        {data.map((d) => {
          const pct = d.total > 0 ? Math.round((d.presentes / d.total) * 100) : 0;
          return (
            <div key={d.clave}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)", marginBottom: 4 }}>
                <span>{d.etiqueta}</span>
                <b style={{ color: "var(--ink)" }}>{d.presentes}/{d.total} · {pct}%</b>
              </div>
              <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
