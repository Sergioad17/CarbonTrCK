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
  {
    t: "Reportes ejecutivos mensuales",
    d: "Consolida la huella por Electricidad y Combustible en un reporte listo para dirección, coordinación y consejos académicos, con desglose por área y evolución mensual.",
  },
  {
    t: "Priorización de áreas críticas",
    d: "Identifica focos de mayor consumo (centros de cómputo, laboratorios, aulas, transporte institucional) y enfoca el presupuesto de reducción donde realmente impacta.",
  },
  {
    t: "Metas y acciones medibles",
    d: "Define metas de reducción por área o categoría y mide el impacto real de cada acción (cambio de equipos, ajuste de horarios, mantenimiento) con evidencia.",
  },
  {
    t: "Detección temprana con alertas",
    d: "Configura reglas para detectar picos de consumo, desviaciones contra metas o lecturas anómalas de dispositivos antes de que se traduzcan en sobrecostos.",
  },
  {
    t: "Cumplimiento y certificaciones",
    d: "Mantén un historial auditable de datos, factores y cálculos para procesos de certificación ambiental, auditorías internas o reportes regulatorios.",
  },
  {
    t: "Investigación y datos abiertos",
    d: "Aprovecha las series de tiempo y el histórico estructurado para proyectos académicos, tesis, modelos de predicción y publicaciones de sostenibilidad.",
  },
];

export const TESTS = [
  { r: "¿Qué hace?", q: "El prototipo se instala en el tablero o en la línea principal de un área (p. ej. Centro de Cómputo, Aulas). Mide consumo eléctrico en tiempo real y genera registros continuos sin captura manual." },
  { r: "¿Qué mide?", q: "Registra corriente y voltaje para calcular potencia y energía: V RMS, I RMS, W (potencia real), kWh acumulados y estado de calidad del dato (medición real). Todo queda con fecha/hora para auditoría." },
  { r: "Del sensor al dashboard", q: "Las lecturas se guardan como series de tiempo y se agregan por hora/día/mes. CarbonTrack convierte kWh → CO₂e con factores de emisión y muestra comparativos por área, tendencias y ranking de consumo." },
  { r: "Menos trabajo, más precisión", q: "Reduce errores humanos y acelera reportes. Permite detectar picos de consumo, comparar áreas y justificar decisiones (cambios de equipos, horarios, mantenimiento) con datos medidos." },
];
