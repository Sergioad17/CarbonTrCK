import { R } from "../components/Reveal";
import {
  BadgeCheck,
  BarChart3,
  Bot,
  Flame,
  School,
  Search,
  Target,
  Zap,
} from "lucide-react";

const ICONS = {
  barChart3: BarChart3,
  search: Search,
  zap: Zap,
  flame: Flame,
  school: School,
  badgeCheck: BadgeCheck,
  target: Target,
  bot: Bot,
};

export default function FeaturesSection({ feats }) {
  return (
    <section id="features" className="lnd-sec lnd-c">
      <R><div className="lnd-sl">Features</div></R>
      <R><h2 className="lnd-st">Gestiona emisiones como un profesional</h2></R>
      <R><p className="lnd-ss">CarbonTrack es una herramienta integral que cubre desde la captura hasta la gestión de mejoras.</p></R>
      <R>
        <div className="lnd-fg">
          {feats.map((f, i) => {
            const Icon = ICONS[f.i];
            return (
              <div key={i} className={`lnd-fc${f.big ? " big" : ""}`}>
                <div className="lnd-fi" style={{ background: f.bg }}>
                  {Icon ? <Icon size={20} strokeWidth={2.2} /> : null}
                </div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            );
          })}
        </div>
      </R>
    </section>
  );
}
