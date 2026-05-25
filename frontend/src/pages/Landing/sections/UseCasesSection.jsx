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
              <div className="lnd-ci-h">
                <span className="lnd-ci-b" aria-hidden="true">→</span>
                <span className="lnd-ci-t">{c.t}</span>
              </div>
              <p className="lnd-ci-d">{c.d}</p>
            </div>
          ))}
        </div>
      </R>
    </section>
  );
}
