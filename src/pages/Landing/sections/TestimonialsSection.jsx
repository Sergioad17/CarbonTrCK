import { R } from "../components/Reveal";

export default function TestimonialsSection({ tests }) {
  return (
    <section id="testimonials" className="lnd-sec lnd-c">
      <R><div className="lnd-sl">Prototipo</div></R>
      <R><h2 className="lnd-st">Medición automatica por área</h2></R>
      <R>
        <div className="lnd-tg">
          {tests.map((t, i) => (
            <div key={i} className="lnd-tc">
              <div className="lnd-tr2">{t.r}</div>
              <q>{t.q}</q>
            </div>
          ))}
        </div>
      </R>
    </section>
  );
}
