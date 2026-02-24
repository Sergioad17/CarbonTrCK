import { R } from "../components/Reveal";

export default function DifferentiationSection({ diffs }) {
  return (
    <section className="lnd-sec lnd-c">
      <R><div className="lnd-sl">Diferenciación</div></R>
      <R><h2 className="lnd-st">Diseñado para campus: no es una calculadora genérica</h2></R>
      <R><p className="lnd-ss">Mientras muchas herramientas se quedan en un número final o requieren infraestructura perfecta, CarbonTrack está pensado para el contexto real de instituciones educativas.</p></R>
      <R>
        <div className="lnd-dl">
          {diffs.map((d, i) => (
            <div key={i} className="lnd-di">
              <div className="lnd-dk">✓</div>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#94A3B8", lineHeight: 1.6 }}>{d}</span>
            </div>
          ))}
        </div>
      </R>
    </section>
  );
}
