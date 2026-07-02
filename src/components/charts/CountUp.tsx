"use client";

import { useEffect, useState } from "react";

/** El HTML de SSR muestra `value` directamente (useState inicial = value, sin mismatch de
 *  hidratación); la animación de conteo es un efecto puramente visual que arranca tras montar,
 *  y respeta `prefers-reduced-motion` saltando directo al valor final. */
export default function CountUp({ value, duracionMs = 900 }: { value: number; duracionMs?: number }) {
  const [mostrado, setMostrado] = useState(value);

  useEffect(() => {
    // Con reduced-motion, duracion=0 hace que el primer frame ya cierre en progreso=1 — el
    // setState sigue ocurriendo dentro del callback asíncrono de rAF, nunca síncrono en el
    // cuerpo del efecto.
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duracion = reducido ? 0 : duracionMs;
    const inicio = performance.now();
    let frame: number;
    const tick = (ahora: number) => {
      const progreso = duracion === 0 ? 1 : Math.min((ahora - inicio) / duracion, 1);
      const facilitado = 1 - Math.pow(1 - progreso, 3);
      setMostrado(Math.round(value * facilitado));
      if (progreso < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duracionMs]);

  return <>{mostrado}</>;
}
