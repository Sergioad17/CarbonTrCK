export const PAINS = [
  { t: "Datos dispersos", d: "Recibos, bitácoras, inventarios y hojas de cálculo en diferentes formatos sin consistencia." },
  { t: "Cálculos sin trazabilidad", d: "Nadie sabe de dónde salió el número. Difícil auditar o justificar ante dirección." },
  { t: "Sin desglose por áreas", d: "Todo se reporta como 'campus completo' sin saber dónde atacar primero." },
  { t: "Medición sin acción", d: "Se mide pero no se conecta con metas ni se da seguimiento real a reducciones." },
];

export const FEATS = [
  { i: "barChart3", t: "Dashboard ejecutivo", d: "Huella total, Scope 1/2, tendencia por tiempo, ranking por áreas y distribución por categorías. Para directivos y responsables.", bg: "rgba(34,197,94,.08)" },
  { i: "search", t: "Emisiones con drill-down", d: "Filtra por periodo, área, categoría y calidad del dato. Gráficas interactivas con clic para bajar al detalle.", bg: "rgba(59,130,246,.08)" },
  { i: "zap", t: "Scope 2: Electricidad", d: "Convierte kWh a CO₂e y analiza consumo eléctrico por áreas. Detecta incrementos y prioriza mejoras.", bg: "rgba(59,130,246,.08)" },
  { i: "flame", t: "Scope 1: Combustible", d: "Registra litros y tipo de combustible. Emisiones directas con desglose temporal y por actividad.", bg: "rgba(234,179,8,.08)" },
  { i: "school", t: "Áreas del campus", d: "Aulas, laboratorios, centros de cómputo, redes, administración e industrial. Identifica qué áreas dominan la huella.", bg: "rgba(139,92,246,.08)" },
  { i: "badgeCheck", t: "Trazabilidad y calidad", d: "Cada registro indica si es real o estimado, su fuente y factor aplicado. Credibilidad sin números sin respaldo.", bg: "rgba(34,197,94,.08)" },
  { i: "target", t: "Metas y acciones", d: "Define línea base, fija objetivos, asigna acciones con responsables y estima impacto. No solo mide: gestiona.", bg: "rgba(236,72,153,.08)", big: true },
  { i: "bot", t: "Preparado para IA", d: "Base lista para modelos que predigan consumos o detecten anomalías. Alertas sobre picos inesperados.", bg: "rgba(6,182,212,.08)", big: true },
];

export const DIFFS = [
  "Huella por área y actividad académica, no solo por 'campus completo'.",
  "Calidad del dato (real vs estimado) integrada en análisis y reportes.",
  "Trazabilidad auditable: dato × factor = CO₂e con evidencia.",
  "Ciclo cerrado: medir → priorizar → metas → acciones → seguimiento.",
  "Operable con recursos limitados: inventarios y estimaciones desde el día 1.",
];

export const CASES = [
  "Reporte mensual de Scope 1 y 2 para dirección y coordinación.",
  "Priorización de áreas críticas (centros de cómputo vs aulas).",
  "Seguimiento de acciones (cambio de equipos, horarios) con impacto estimado.",
  "Preparación para certificaciones de sustentabilidad.",
  "Base para proyectos de investigación (series de tiempo, predicción).",
];

export const TESTS = [
  { r: "Coordinación Académica", q: "Por fin tenemos un tablero claro para comparar áreas y justificar decisiones con datos." },
  { r: "Responsable de Centro de Cómputo", q: "Identificamos cuándo se dispara el consumo y qué cambios tienen más impacto." },
  { r: "Dirección / Planeación", q: "La trazabilidad ayuda a presentar resultados sin dudas: dato, factor y evidencia." },
  { r: "Área de Sustentabilidad", q: "Metas y acciones nos permiten dar seguimiento real, no solo reportar números." },
];
