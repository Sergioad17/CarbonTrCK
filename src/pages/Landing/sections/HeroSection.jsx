import { lazy, Suspense } from "react";
import { R } from "../components/Reveal";
import { Leaf, Sparkles } from "lucide-react";

const HeroModel = lazy(() => import("../components/HeroModel"));

function HeroModelFallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(241,245,249,.72)",
        fontSize: 12,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "'JetBrains Mono',monospace",
      }}
    >
      loading
    </div>
  );
}

export default function HeroSection({ onGo }) {
  return (
    <section className="lnd-hero lnd-c">
      <R>
        <div className="lnd-sl">
          <Sparkles size={14} strokeWidth={2.2} />
          Huella de carbono institucional
        </div>
      </R>

      <R>
        <h1
          className="lnd-st"
          style={{
            textAlign: "center",
            maxWidth: 820,
            margin: "0 auto 16px",
            fontSize: "clamp(34px,5.5vw,60px)",
            background: "linear-gradient(135deg,#fff 0%,#22C55E 50%,#4ADE80 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Medición y gestión de huella de carbono para instituciones educativas
        </h1>
      </R>

      <R>
        <p className="lnd-ss" style={{ margin: "0 auto", textAlign: "center" }}>
          Convierte consumos reales y estimados en CO₂e con trazabilidad completa. Monitorea el consumo eléctrico con histórico y controla el combustible por actividades y vehículos/equipos. Analiza por áreas del campus y gestiona metas de reducción con evidencia.
        </p>
      </R>

      <R>
        <p className="lnd-hm">
           Funciona con recibos, inventarios y bitácoras
        </p>
      </R>

      <R>
        <div className="lnd-hc">
          <button className="btn1" onClick={onGo}>
            <Leaf size={16} strokeWidth={2.2} />
            Agendar demo
          </button>
          <button className="btn2" onClick={onGo}>Ver el producto</button>
        </div>
      </R>

      <R>
        <p className="lnd-hn">Fácil de usar · Datos locales · Listo para escalar a institución</p>
      </R>

      <R>
        <div className="lnd-pv">
          <div className="lnd-pvg" />
          <div className="lnd-pvi">
            <Suspense fallback={<HeroModelFallback />}>
              <HeroModel />
            </Suspense>
          </div>
        </div>
      </R>
    </section>
  );
}
