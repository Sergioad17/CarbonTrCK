import { useEffect } from "react";
import { Clock, LogIn, ShieldAlert, Sparkles } from "lucide-react";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STYLES = `
@keyframes ctSeFadeIn{from{opacity:0}to{opacity:1}}
@keyframes ctSePop{from{opacity:0;transform:scale(.92) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes ctSeOrbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes ctSePulse{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.18);opacity:.10}}
@keyframes ctSeRingPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.45),0 0 0 0 rgba(245,158,11,.20)}50%{box-shadow:0 0 0 14px rgba(245,158,11,.05),0 0 0 28px rgba(245,158,11,0)}}
@keyframes ctSeShineSweep{0%{transform:translateX(-110%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}
@keyframes ctSeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes ctSeTick{0%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}100%{transform:rotate(-10deg)}}

.ct-se-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 50% 30%,rgba(15,23,42,.55),rgba(15,23,42,.78));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:ctSeFadeIn .28s ease-out}
.ct-se-card{position:relative;width:min(460px,100%);background:var(--eco-card,#FFFFFF);color:var(--eco-text,#1E293B);border-radius:22px;border:1px solid var(--eco-border,#E2E8F0);box-shadow:0 30px 80px -30px rgba(15,23,42,.45),0 12px 32px -12px rgba(15,23,42,.20);padding:32px 30px 28px;text-align:center;overflow:hidden;animation:ctSePop .42s cubic-bezier(.22,1,.36,1) both}
.ct-se-card::before{content:"";position:absolute;top:-90px;right:-60px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,.18),transparent 60%);pointer-events:none}
.ct-se-card::after{content:"";position:absolute;bottom:-120px;left:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.10),transparent 60%);pointer-events:none}
.ct-se-card>*{position:relative;z-index:1}

.ct-se-glyph-stage{position:relative;width:96px;height:96px;margin:0 auto 18px;display:grid;place-items:center}
.ct-se-glyph-stage::before{content:"";position:absolute;inset:0;border-radius:50%;border:1.5px dashed rgba(245,158,11,.35);animation:ctSeOrbit 14s linear infinite}
.ct-se-glyph-stage::after{content:"";position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle,rgba(245,158,11,.18),transparent 70%);animation:ctSePulse 2.4s ease-in-out infinite}
.ct-se-glyph{position:relative;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#F59E0B 0%,#D97706 100%);color:#fff;box-shadow:0 14px 30px -10px rgba(217,119,6,.55),inset 0 0 0 1px rgba(255,255,255,.20);animation:ctSeRingPulse 2.6s ease-in-out infinite}
.ct-se-glyph svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.18))}
.ct-se-glyph-spark{position:absolute;color:#FCD34D}
.ct-se-glyph-spark.s1{top:-2px;right:0;animation:ctSeFloat 2.2s ease-in-out infinite;animation-delay:.0s}
.ct-se-glyph-spark.s2{bottom:4px;left:-2px;animation:ctSeFloat 2.2s ease-in-out infinite;animation-delay:.4s}

.ct-se-eyebrow{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);font-family:${fb};font-size:11px;font-weight:700;color:#B45309;text-transform:uppercase;letter-spacing:.10em;margin-bottom:12px}
.ct-se-eyebrow-tick{display:inline-flex;animation:ctSeTick 1.4s ease-in-out infinite;color:#D97706}
.ct-se-title{margin:0 0 10px;font-family:${fd};font-size:24px;font-weight:800;color:var(--eco-text-strong,#0F172A);letter-spacing:-0.025em;line-height:1.18}
.ct-se-sub{margin:0 0 24px;font-family:${fb};font-size:14px;line-height:1.55;color:var(--eco-text-soft,#64748B)}

.ct-se-meta{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 22px;padding:10px 14px;border-radius:12px;background:rgba(245,158,11,.05);border:1px dashed rgba(245,158,11,.25);font-family:${fb};font-size:12px;color:var(--eco-text-soft,#64748B)}
.ct-se-meta strong{color:var(--eco-text,#1E293B);font-family:${fm};font-weight:700;letter-spacing:.01em}

.ct-se-cta{position:relative;width:100%;height:52px;border-radius:14px;border:none;background:linear-gradient(135deg,#22C55E 0%,#15803D 100%);color:#fff;font-family:${fb};font-size:14.5px;font-weight:700;letter-spacing:.005em;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 14px 28px -10px rgba(21,128,61,.55),inset 0 -2px 0 rgba(0,0,0,.10);transition:transform 200ms cubic-bezier(.4,0,.2,1),box-shadow 200ms ease,filter 200ms ease;overflow:hidden;isolation:isolate}
.ct-se-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.45) 50%,transparent 65%);transform:translateX(-110%) skewX(-18deg);pointer-events:none;z-index:0}
.ct-se-cta:hover::after{animation:ctSeShineSweep 1.0s cubic-bezier(.4,0,.2,1) forwards}
.ct-se-cta:hover{transform:translateY(-1px);box-shadow:0 18px 34px -10px rgba(21,128,61,.6),inset 0 -2px 0 rgba(0,0,0,.12);filter:brightness(1.04)}
.ct-se-cta:active{transform:translateY(0);filter:brightness(.98)}
.ct-se-cta>*{position:relative;z-index:1}

.ct-se-foot{margin:14px 0 0;font-family:${fb};font-size:11.5px;color:var(--eco-text-soft,#64748B);letter-spacing:.005em}
.ct-se-foot strong{color:var(--eco-text,#1E293B);font-weight:700}

/* ─── Dark mode ─── */
:root[data-theme="dark"] .ct-se-overlay{background:radial-gradient(circle at 50% 30%,rgba(2,6,23,.7),rgba(2,6,23,.86))}
:root[data-theme="dark"] .ct-se-card{background:var(--eco-card);border-color:var(--eco-border);color:var(--eco-text);box-shadow:0 30px 80px -30px rgba(0,0,0,.7),0 12px 32px -12px rgba(0,0,0,.4)}
:root[data-theme="dark"] .ct-se-card::before{background:radial-gradient(circle,rgba(250,204,21,.20),transparent 60%)}
:root[data-theme="dark"] .ct-se-card::after{background:radial-gradient(circle,rgba(74,222,128,.14),transparent 60%)}
:root[data-theme="dark"] .ct-se-glyph-stage::before{border-color:rgba(250,204,21,.40)}
:root[data-theme="dark"] .ct-se-glyph-stage::after{background:radial-gradient(circle,rgba(250,204,21,.22),transparent 70%)}
:root[data-theme="dark"] .ct-se-glyph{background:linear-gradient(135deg,#FACC15 0%,#D97706 100%);box-shadow:0 14px 30px -10px rgba(217,119,6,.55),inset 0 0 0 1px rgba(255,255,255,.22)}
:root[data-theme="dark"] .ct-se-eyebrow{background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.32);color:#FCD34D}
:root[data-theme="dark"] .ct-se-eyebrow-tick{color:#FBBF24}
:root[data-theme="dark"] .ct-se-title{color:var(--eco-text-strong)}
:root[data-theme="dark"] .ct-se-sub{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-se-meta{background:rgba(250,204,21,.06);border-color:rgba(250,204,21,.24)}
:root[data-theme="dark"] .ct-se-meta strong{color:var(--eco-text)}
:root[data-theme="dark"] .ct-se-cta{background:linear-gradient(135deg,#4ADE80 0%,#16A34A 100%);box-shadow:0 14px 28px -10px rgba(22,163,74,.55),inset 0 -2px 0 rgba(0,0,0,.20)}
:root[data-theme="dark"] .ct-se-cta:hover{box-shadow:0 18px 34px -10px rgba(22,163,74,.65),inset 0 -2px 0 rgba(0,0,0,.22)}
:root[data-theme="dark"] .ct-se-cta::after{background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.30) 50%,transparent 65%)}
:root[data-theme="dark"] .ct-se-foot{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-se-foot strong{color:var(--eco-text-strong)}
`;

export default function SessionExpiredOverlay({ open, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onConfirm?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onConfirm]);

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="ct-se-overlay" role="alertdialog" aria-modal="true" aria-labelledby="ct-se-title" aria-describedby="ct-se-sub">
        <div className="ct-se-card">
          <div className="ct-se-glyph-stage" aria-hidden="true">
            <Sparkles size={11} className="ct-se-glyph-spark s1" />
            <Sparkles size={9} className="ct-se-glyph-spark s2" />
            <div className="ct-se-glyph">
              <ShieldAlert size={28} strokeWidth={2.4} />
            </div>
          </div>

          <span className="ct-se-eyebrow">
            <span className="ct-se-eyebrow-tick"><Clock size={11} strokeWidth={2.6} /></span>
            Sesión finalizada
          </span>

          <h2 id="ct-se-title" className="ct-se-title">¿Hola, aún sigues ahí?</h2>
          <p id="ct-se-sub" className="ct-se-sub">
            Tu sesión ha expirado, pero no te preocupes: puedes volver a iniciar sesión y retomar tu trabajo justo donde lo dejaste.
          </p>

          <div className="ct-se-meta">
            <Clock size={13} />
            Tus datos se conservaron — no perdiste <strong>nada</strong>.
          </div>

          <button type="button" className="ct-se-cta" onClick={onConfirm} autoFocus>
            <LogIn size={16} strokeWidth={2.4} />
            Iniciar sesión de nuevo
          </button>

          <p className="ct-se-foot">
            Pulsa <strong>Enter</strong> para continuar
          </p>
        </div>
      </div>
    </>
  );
}
