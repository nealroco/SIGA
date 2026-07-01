import Link from "next/link";
import { redirect } from "next/navigation";
import { Bus, UtensilsCrossed, Users, MapPin } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  composicionPorEstrato,
  composicionPorUbicacionVivienda,
  composicionPorSexo,
  composicionPorDescolarizado,
  composicionPorSistemaSalud,
  composicionPorVictimaConflicto,
  composicionPorTipoPoblacion,
  composicionPorJornada,
  gradoPorDescolarizado,
  afiliacionSaludPorGrado,
  complementoAlimentarioPorGrado,
  medioTransportePorGrado,
  beneficiariosPorDepartamento,
} from "@/lib/estadisticasBeneficiarios";
import DonutCategorias from "@/components/charts/DonutCategorias";
import BarChartAgrupado from "@/components/charts/BarChartAgrupado";
import BarChartSimple from "@/components/charts/BarChartSimple";

export const dynamic = "force-dynamic";

export default async function EstadisticasBeneficiariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await can(session.user.rol, "MOD-001", "ver"))) redirect("/beneficiarios");

  const [
    estrato, ubicacion, sexo, descolarizado, sistemaSalud, victimaConflicto, tipoPoblacion, jornada,
    crucePorDescolarizado, cruceAfiliacion, cruceAlimentario, cruceTransporte,
    porDepartamento,
    totalActivos, conAlimentacion, conTransporte,
  ] = await Promise.all([
    composicionPorEstrato(),
    composicionPorUbicacionVivienda(),
    composicionPorSexo(),
    composicionPorDescolarizado(),
    composicionPorSistemaSalud(),
    composicionPorVictimaConflicto(),
    composicionPorTipoPoblacion(),
    composicionPorJornada(),
    gradoPorDescolarizado(),
    afiliacionSaludPorGrado(),
    complementoAlimentarioPorGrado(),
    medioTransportePorGrado(),
    beneficiariosPorDepartamento(),
    prisma.beneficiario.count({ where: { estado: "Activo" } }),
    prisma.beneficiario.count({ where: { estado: "Activo", cuentaConAlimentacion: true } }),
    prisma.beneficiario.count({ where: { estado: "Activo", requiereTransporteCentro: true } }),
  ]);

  const pctAlimentacion = totalActivos > 0 ? Math.round((conAlimentacion / totalActivos) * 100) : 0;
  const pctTransporte = totalActivos > 0 ? Math.round((conTransporte / totalActivos) * 100) : 0;
  const totalPorDepartamento = porDepartamento.reduce((acc, d) => acc + d.count, 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 className="page-title">Estadísticas de beneficiarios</h1>
          <p className="page-sub">MOD-001 · composición, cruces por grado y presencia geográfica.</p>
        </div>
        <Link href="/beneficiarios" className="btn">← Beneficiarios</Link>
      </div>

      <div className="kpi-grid" style={{ marginTop: 22 }}>
        <div className="card kpi accent">
          <div className="kpi-head"><div className="kpi-badge"><Users /></div></div>
          <div className="lab">Beneficiarios activos</div>
          <div className="val">{totalActivos}</div>
          <div className="hint">base de esta página</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><div className="kpi-badge tone-green"><UtensilsCrossed /></div></div>
          <div className="lab">Con alimentación</div>
          <div className="val">{conAlimentacion}</div>
          <div className="hint">{pctAlimentacion}% del total activo</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><div className="kpi-badge tone-amber"><Bus /></div></div>
          <div className="lab">Requieren transporte</div>
          <div className="val">{conTransporte}</div>
          <div className="hint">{pctTransporte}% del total activo</div>
        </div>
        <div className="card kpi">
          <div className="kpi-head"><div className="kpi-badge tone-blue"><MapPin /></div></div>
          <div className="lab">Departamentos con presencia</div>
          <div className="val">{porDepartamento.length}</div>
          <div className="hint">{totalPorDepartamento} beneficiarios con territorio asignado</div>
        </div>
      </div>

      <p className="section-cap" style={{ marginTop: 28 }}>Composición de beneficiarios</p>
      <div className="modulos-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <DonutCategorias titulo="Estrato" data={estrato} />
        <DonutCategorias titulo="Ubicación de vivienda" data={ubicacion} />
        <DonutCategorias titulo="Sexo" data={sexo} />
        <DonutCategorias titulo="Desescolarizado" data={descolarizado} />
        <DonutCategorias titulo="Sistema de salud" data={sistemaSalud} />
        <DonutCategorias titulo="Víctima del conflicto armado" data={victimaConflicto} />
        <DonutCategorias titulo="Tipo de población" data={tipoPoblacion} />
        <DonutCategorias titulo="Jornada" data={jornada} />
      </div>

      <p className="section-cap" style={{ marginTop: 28 }}>Cruces por grado</p>
      <div className="modulos-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))" }}>
        <div className="card" style={{ padding: 16 }}>
          <p className="section-cap" style={{ marginTop: 0 }}>Grado × Desescolarizado</p>
          <BarChartAgrupado data={crucePorDescolarizado.filas} series={crucePorDescolarizado.series} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="section-cap" style={{ marginTop: 0 }}>Afiliación a salud × Grado</p>
          <BarChartAgrupado data={cruceAfiliacion.filas} series={cruceAfiliacion.series} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="section-cap" style={{ marginTop: 0 }}>Tipo de complemento alimentario × Grado</p>
          <BarChartAgrupado data={cruceAlimentario.filas} series={cruceAlimentario.series} />
        </div>
        <div className="card" style={{ padding: 16 }}>
          <p className="section-cap" style={{ marginTop: 0 }}>Medio de transporte × Grado</p>
          <BarChartAgrupado data={cruceTransporte.filas} series={cruceTransporte.series} />
        </div>
      </div>

      <p className="section-cap" style={{ marginTop: 28 }}>Beneficiarios por departamento</p>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        {porDepartamento.length === 0 ? (
          <div className="card" style={{ padding: 24 }}><p className="empty">Sin datos</p></div>
        ) : (
          <div className="card" style={{ padding: "18px 8px" }}>
            <BarChartSimple data={porDepartamento.map((d) => ({ label: d.categoria, count: d.count }))} />
          </div>
        )}
        <DonutCategorias titulo="% por departamento" data={porDepartamento} />
      </div>
    </div>
  );
}
