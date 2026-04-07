import { R } from "../components/Reveal";

export default function ProblemSection({ pains }) {
  return (
    <section className="lnd-sec lnd-c">
      <R><div className="lnd-sl">El problema</div></R>
      <R><h2 className="lnd-st">Medir emisiones en un campus es difícil cuando los datos están dispersos</h2></R>
      <R><p className="lnd-ss">En la práctica, el consumo eléctrico, el uso de combustible y la actividad operativa se registran en diferentes lugares. Esto provoca reportes incompletos, decisiones sin evidencia y una pregunta recurrente: "¿De dónde salió ese número?"</p></R>
      <R>
        <div className="lnd-pg">
          {pains.map((p, i) => (
            <div key={i} className="lnd-pc">
              <h4>{p.t}</h4>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </R>
    </section>
  );
}
