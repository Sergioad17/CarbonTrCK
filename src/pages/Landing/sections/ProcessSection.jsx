import { R } from "../components/Reveal";

export default function ProcessSection() {
  return (
    <section id="process" className="lnd-sec lnd-c">
      <R><div className="lnd-sl">Proceso</div></R>
      <R><h2 className="lnd-st">Resultados en 3 pasos</h2></R>
      <R>
        <div className="lnd-sg">
          <div className="lnd-stp">
            <div className="lnd-sn">1</div>
            <h3>Captura o importa datos</h3>
            <p>Recibos, mediciones, inventario de equipos o bitácoras. Funciona incluso sin instrumentación completa.</p>
          </div>

          <div className="lnd-stp">
            <div className="lnd-sn">2</div>
            <h3>Calcula CO₂e con trazabilidad</h3>
            <p>Cada dato se convierte con factores y queda documentado: qué se capturó, con qué factor y qué resultado arrojó.</p>
          </div>

          <div className="lnd-stp">
            <div className="lnd-sn">3</div>
            <h3>Analiza, define metas y mejora</h3>
            <p>Dashboards y scopes para entender el presente, metas y acciones para reducir y demostrar avances con evidencia.</p>
          </div>
        </div>
      </R>
    </section>
  );
}
