"use client";

import { useMemo, useState } from "react";
import { Users, Wallet, Trophy, GraduationCap } from "lucide-react";
import MapaCalor from "./MapaCalor";
import MapaPuntos from "./MapaPuntos";
import type { PuntoGeo, EscenarioGeo, PresenciaPrograma } from "@/lib/geo";

type Tab = "poblacion" | "inversion" | "escenarios" | "escuelas";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function PanelGeografico({
  poblacion,
  inversion,
  escenarios,
  presenciaPrograma,
}: {
  poblacion: PuntoGeo[];
  inversion: PuntoGeo[];
  escenarios: EscenarioGeo[];
  presenciaPrograma: PresenciaPrograma[];
}) {
  const [tab, setTab] = useState<Tab>("poblacion");
  const [programaSel, setProgramaSel] = useState<string>("");

  const programas = useMemo(
    () => Array.from(new Set(presenciaPrograma.map((p) => p.programa))).sort(),
    [presenciaPrograma]
  );

  const puntosEscuela = useMemo(() => {
    const filtrado = programaSel ? presenciaPrograma.filter((p) => p.programa === programaSel) : presenciaPrograma;
    const porTerritorio = new Map<number, { municipio: string; lat: number; lng: number; count: number }>();
    for (const p of filtrado) {
      const acc = porTerritorio.get(p.territorioId);
      if (acc) acc.count += p.count;
      else porTerritorio.set(p.territorioId, { municipio: p.municipio, lat: p.lat, lng: p.lng, count: p.count });
    }
    return Array.from(porTerritorio.values());
  }, [presenciaPrograma, programaSel]);

  return (
    <div>
      <div className="toolbar" style={{ marginTop: 0 }}>
        <button className={`btn btn-sm${tab === "poblacion" ? " btn-blue" : ""}`} onClick={() => setTab("poblacion")}>
          <Users size={14} /> Población
        </button>
        <button className={`btn btn-sm${tab === "inversion" ? " btn-blue" : ""}`} onClick={() => setTab("inversion")}>
          <Wallet size={14} /> Inversión
        </button>
        <button className={`btn btn-sm${tab === "escenarios" ? " btn-blue" : ""}`} onClick={() => setTab("escenarios")}>
          <Trophy size={14} /> Escenarios
        </button>
        <button className={`btn btn-sm${tab === "escuelas" ? " btn-blue" : ""}`} onClick={() => setTab("escuelas")}>
          <GraduationCap size={14} /> Escuelas deportivas
        </button>
      </div>

      {tab === "poblacion" && (
        <MapaCalor
          puntos={poblacion.map((p) => ({ lat: p.lat, lng: p.lng, peso: p.valor }))}
          vacioTexto="Ningún territorio tiene beneficiarios activos con coordenadas registradas."
        />
      )}

      {tab === "inversion" && (
        <>
          <MapaCalor
            puntos={inversion.map((p) => ({ lat: p.lat, lng: p.lng, peso: p.valor / 1_000_000 }))}
            vacioTexto="Ningún contrato con cuenta aprobada/pagada tiene municipio asignado todavía."
          />
          {inversion.length > 0 && (
            <p className="page-sub" style={{ marginTop: 8 }}>
              {inversion.map((p) => `${p.municipio}: ${cop.format(p.valor)}`).join(" · ")}
            </p>
          )}
        </>
      )}

      {tab === "escenarios" && (
        <MapaPuntos
          puntos={escenarios.map((e) => ({
            lat: e.lat,
            lng: e.lng,
            label: `${e.nombre}${e.tipo ? ` · ${e.tipo}` : ""}${e.capacidad ? ` · Capacidad ${e.capacidad}` : ""}`,
          }))}
          vacioTexto="Ningún escenario tiene coordenadas registradas (MOD-024 Georeferenciación)."
        />
      )}

      {tab === "escuelas" && (
        <>
          <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
            <label htmlFor="programaSel">Escuela / programa deportivo</label>
            <select
              id="programaSel"
              className="select"
              value={programaSel}
              onChange={(e) => setProgramaSel(e.target.value)}
            >
              <option value="">Todas las escuelas</option>
              {programas.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <MapaPuntos
            puntos={puntosEscuela.map((p) => ({ lat: p.lat, lng: p.lng, label: `${p.municipio} · ${p.count} beneficiario(s)` }))}
            vacioTexto="Sin beneficiarios activos con municipio registrado para esta escuela."
          />
        </>
      )}
    </div>
  );
}
