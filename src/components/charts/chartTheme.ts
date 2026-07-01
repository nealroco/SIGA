// Tokens compartidos por los gráficos de recharts. Los valores de fill/stroke/tick van литerales
// (no var(--...)) porque recharts los renderiza como atributos SVG, que no resuelven custom
// properties de CSS — mismo criterio ya documentado en BarChartSimple.tsx. El estilo del
// <Tooltip> sí puede usar var(--...) porque recharts lo pinta como un <div> HTML normal.

export const TICK_STYLE = { fontSize: 11, fill: "#858dae", fontFamily: "var(--font-sans)" };
export const GRID_STROKE = "#e2e6f2";

export const TOOLTIP_CONTENT_STYLE = {
  background: "var(--white)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  boxShadow: "0 10px 28px -14px rgba(11,21,56,.35)",
  fontFamily: "var(--font-sans)",
  fontSize: 12.5,
  padding: "8px 12px",
};
export const TOOLTIP_LABEL_STYLE = { color: "var(--ink)", fontWeight: 700, marginBottom: 4 };
export const TOOLTIP_ITEM_STYLE = { color: "var(--muted)", padding: 0 };
export const TOOLTIP_CURSOR_STYLE = { fill: "rgba(59,107,255,.06)" };

// Paleta categórica: reutiliza los hex ya usados por .badge/.pill/.kpi-badge en globals.css
// (var(--blue)/var(--coral) + verde/ámbar/azul-info/rojo de esas clases) — se cicla si una
// dimensión tiene más categorías que colores.
export const PALETA_CATEGORICA = [
  "#3b6bff", "#ff5a3c", "#157347", "#9a6a00", "#2747a6", "#b42318", "#586089", "#8fa8ff", "#ff7a5f",
];
