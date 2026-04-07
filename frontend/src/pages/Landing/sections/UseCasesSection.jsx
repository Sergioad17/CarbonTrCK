import { R } from "../components/Reveal";

export default function UseCasesSection({ casesList }) {
  return (
    <section className="lnd-sec lnd-c">
      <R><div className="lnd-sl">Casos de uso</div></R>
      <R><h2 className="lnd-st">Casos de uso típicos</h2></R>
      <R>
        <div className="lnd-cs">
          {casesList.map((c, i) => (
            <div key={i} className="lnd-ci">
              <span style={{ color: "#22C55E", fontSize: 18, flexShrink: 0 }}>→</span>
              {c}
            </div>
          ))}
        </div>
      </R>
    </section>
  );
}
