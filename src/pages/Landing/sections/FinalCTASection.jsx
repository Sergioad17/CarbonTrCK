import { Leaf } from "lucide-react";
import { R } from "../components/Reveal";

export default function FinalCTASection({ onGo }) {
  return (
    <section className="lnd-cf lnd-c">
      <R><h2>Agenda una demo y empieza a medir con trazabilidad</h2></R>
      <R><p className="lnd-ss" style={{ margin: "0 auto 28px", textAlign: "center" }}>CarbonTrack te permite iniciar con datos reales o estimados, visualizar Scope 1/2 y construir un plan de reducción con metas y acciones.</p></R>
      <R>
        <div className="lnd-hc">
          <button className="btn1" onClick={onGo}>
            <Leaf size={16} strokeWidth={2.2} />
            Agendar demo
          </button>
          <button className="btn2" onClick={onGo}>Ver el producto →</button>
        </div>
      </R>
      <R><p className="lnd-hn" style={{ marginTop: 16 }}>Sin promesas vacías: enfoque práctico, medible y escalable.</p></R>
    </section>
  );
}
