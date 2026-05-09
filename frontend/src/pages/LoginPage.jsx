import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Leaf, Mail, Lock,
  Eye, EyeOff, Loader2,
  ArrowRight, CheckCircle2, AlertCircle,
  ShieldCheck, Sparkles, KeyRound, WifiOff,
  Building2, BarChart3,
} from 'lucide-react'
import './Animations.css'
import './BackgroundPatterns/FingerprintLoginAnimation.css'
import { isUsingBackendAuth, requestPasswordReset } from '../api/auth'

const fd = "var(--eco-font-display)"
const fb = "var(--eco-font-body)"
const fm = "var(--eco-font-mono)"

const LOGIN_CSS = `
@keyframes ctLoginFadeIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctLogoSheen{0%,80%{transform:translateX(-160%) skewX(-18deg)}100%{transform:translateX(220%) skewX(-18deg)}}
@keyframes ctLogoGlow{0%,100%{filter:drop-shadow(0 6px 14px rgba(34,197,94,.35))}50%{filter:drop-shadow(0 8px 20px rgba(34,197,94,.55))}}
@keyframes ctTitleSparkle{0%,100%{opacity:.5;transform:rotate(-12deg) scale(.92)}50%{opacity:1;transform:rotate(8deg) scale(1.06)}}
@keyframes ctSubtleFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes ctRingPulseLogin{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.40)}50%{box-shadow:0 0 0 12px rgba(34,197,94,0)}}
@keyframes ctBubble1{0%{transform:translate(0,0) scale(1)}25%{transform:translate(28vw,-12vh) scale(1.08)}50%{transform:translate(56vw,28vh) scale(.92)}75%{transform:translate(18vw,52vh) scale(1.06)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble2{0%{transform:translate(0,0) scale(1)}25%{transform:translate(-22vw,18vh) scale(.95)}50%{transform:translate(-46vw,-18vh) scale(1.10)}75%{transform:translate(-10vw,-10vh) scale(1.02)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble3{0%{transform:translate(0,0) scale(1)}33%{transform:translate(34vw,32vh) scale(1.10)}66%{transform:translate(-20vw,18vh) scale(.95)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble4{0%{transform:translate(0,0) scale(1)}25%{transform:translate(-28vw,-22vh) scale(1.05)}50%{transform:translate(-12vw,-44vh) scale(.94)}75%{transform:translate(20vw,-20vh) scale(1.08)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble5{0%{transform:translate(0,0) scale(1)}50%{transform:translate(40vw,-40vh) scale(1.12)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble6{0%{transform:translate(0,0) scale(1)}25%{transform:translate(-44vw,12vh) scale(1.08)}50%{transform:translate(-30vw,46vh) scale(.94)}75%{transform:translate(8vw,30vh) scale(1.04)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble7{0%{transform:translate(0,0) scale(1)}33%{transform:translate(48vw,18vh) scale(1.06)}66%{transform:translate(34vw,-26vh) scale(.96)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble8{0%{transform:translate(0,0) scale(1)}25%{transform:translate(-18vw,-32vh) scale(1.10)}50%{transform:translate(22vw,-18vh) scale(.92)}75%{transform:translate(34vw,16vh) scale(1.05)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble9{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-36vw,-30vh) scale(1.08)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubble10{0%{transform:translate(0,0) scale(1)}33%{transform:translate(20vw,40vh) scale(1.06)}66%{transform:translate(-18vw,30vh) scale(.94)}100%{transform:translate(0,0) scale(1)}}
@keyframes ctBubblePulse{0%,100%{opacity:.85}50%{opacity:.55}}

.ct-login-stage{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden;box-sizing:border-box}
.ct-login-shell{position:relative;z-index:2;display:flex;align-items:stretch;justify-content:center;gap:0;width:min(960px,100%);margin-inline:auto;animation:ctLoginFadeIn .55s cubic-bezier(.22,1,.36,1) both;border-radius:22px;box-shadow:0 30px 80px -32px rgba(15,23,42,.45),0 8px 24px -10px rgba(15,23,42,.10)}
.ct-login-shell > .ct-login-card{border-top-right-radius:0;border-bottom-right-radius:0;box-shadow:none}
.ct-login-shell > .ct-login-aside{border-top-left-radius:0;border-bottom-left-radius:0;box-shadow:none;border-left:1px solid rgba(255,255,255,.06)}
.ct-bubbles-stage{position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.ct-bubble{position:absolute;border-radius:50%;will-change:transform,opacity;animation-fill-mode:both;mix-blend-mode:plus-lighter;display:grid;place-items:center;text-align:center}
.ct-bubble-label{font-family:var(--eco-font-display);font-weight:800;color:rgba(255,255,255,.78);letter-spacing:.04em;text-shadow:0 2px 10px rgba(15,23,42,.30),0 0 22px rgba(34,197,94,.22);pointer-events:none;user-select:none;text-transform:uppercase}
.ct-login-card{position:relative;z-index:2;width:min(460px,100%);background:rgba(255,255,255,.86);backdrop-filter:blur(22px) saturate(140%);-webkit-backdrop-filter:blur(22px) saturate(140%);border:1px solid rgba(255,255,255,.55);border-radius:22px;box-shadow:0 30px 80px -32px rgba(15,23,42,.45),0 8px 24px -10px rgba(15,23,42,.10),inset 0 1px 0 rgba(255,255,255,.7);padding:34px 34px 26px;animation:ctLoginFadeIn .55s cubic-bezier(.22,1,.36,1) both;overflow:hidden;isolation:isolate}
.ct-login-card::before{content:"";position:absolute;top:-100px;right:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.26),transparent 70%);pointer-events:none;z-index:-1}
.ct-login-card::after{content:"";position:absolute;bottom:-130px;left:-90px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.20),transparent 70%);pointer-events:none;z-index:-1}

.ct-login-logo{display:inline-flex;align-items:center;gap:11px;margin-bottom:22px;animation:ctSubtleFloat 4.6s ease-in-out infinite}
.ct-login-logo-mark{position:relative;width:44px;height:44px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#22C55E 0%,#15803D 100%);color:#fff;overflow:hidden;animation:ctLogoGlow 3.4s ease-in-out infinite,ctRingPulseLogin 3s ease-out infinite}
.ct-login-logo-mark::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);transform:translateX(-160%) skewX(-18deg);pointer-events:none;animation:ctLogoSheen 4.8s ease-in-out infinite}
.ct-login-logo-text-title{display:block;font-family:${fd};font-size:18px;font-weight:800;color:var(--eco-gray-900);line-height:1.05;letter-spacing:-0.005em}
.ct-login-logo-text-sub{display:block;font-family:${fb};font-size:10.5px;color:var(--eco-gray-500);letter-spacing:.10em;font-weight:600;text-transform:uppercase;margin-top:1px}
.ct-login-eyebrow{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;background:linear-gradient(135deg,rgba(34,197,94,.10),rgba(96,165,250,.10));border:1px solid rgba(34,197,94,.22);font-family:${fb};font-size:10.5px;font-weight:700;color:#15803D;text-transform:uppercase;letter-spacing:.10em;margin-bottom:14px}
.ct-login-eyebrow-spark{display:inline-flex;color:#22C55E;animation:ctTitleSparkle 1.8s ease-in-out infinite}
.ct-login-title{margin:0 0 8px;font-family:${fd};font-size:26px;font-weight:800;color:var(--eco-gray-900);letter-spacing:-0.024em;line-height:1.14;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ct-login-title-spark{color:#EAB308;animation:ctTitleSparkle 2.2s ease-in-out infinite}
.ct-login-sub{margin:0 0 22px;font-family:${fb};font-size:14px;color:var(--eco-gray-500);line-height:1.55}

.ct-login-trust{display:flex;align-items:center;justify-content:center;gap:7px;margin:14px 0 4px;padding:9px 12px;border-radius:999px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.18);font-family:${fb};font-size:11.5px;font-weight:600;color:#15803D}
.ct-login-trust-dot{width:6px;height:6px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 3px rgba(34,197,94,.20),0 0 8px rgba(34,197,94,.55)}

.ct-login-foot{margin:18px 0 0;text-align:center;font-family:${fb};font-size:11px;color:var(--eco-gray-400);letter-spacing:.005em}
.ct-login-back{width:100%;margin-top:14px;padding:8px 0;font-family:${fb};font-size:13px;font-weight:600;color:var(--eco-primary-600);background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:color 150ms ease}
.ct-login-back:hover{color:var(--eco-primary-700)}

.ct-login-help-row{display:flex;justify-content:flex-end;margin:-4px 0 18px}
.ct-login-help-link{font-family:${fb};font-size:13px;font-weight:600;color:var(--eco-primary-600);background:none;border:none;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:5px;transition:color 150ms ease}
.ct-login-help-link:hover{color:var(--eco-primary-700)}

.ct-login-banner-warn{display:flex;align-items:flex-start;gap:11px;padding:12px 14px;border-radius:12px;background:rgba(234,179,8,.10);border:1px solid rgba(234,179,8,.28);margin-bottom:16px;animation:ctLoginFadeIn .35s ease-out}
.ct-login-banner-warn-ico{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:rgba(234,179,8,.18);color:#B45309;flex-shrink:0}
.ct-login-banner-warn-title{margin:0 0 2px;font-family:${fd};font-size:13px;font-weight:700;color:#92400E}
.ct-login-banner-warn-desc{margin:0;font-family:${fb};font-size:12px;color:#78350F;line-height:1.45}

/* ─── Aside (stats panel) ─── */
.ct-login-aside{position:relative;z-index:2;width:340px;flex-shrink:0;display:flex;flex-direction:column;padding:30px 28px 26px;border-radius:22px;border:1px solid rgba(34,197,94,.28);background:linear-gradient(155deg,rgba(20,83,45,.92) 0%,rgba(15,55,30,.94) 55%,rgba(10,42,24,.96) 100%);color:#fff;overflow:hidden;isolation:isolate;box-shadow:0 30px 80px -32px rgba(15,55,30,.55),0 8px 24px -10px rgba(15,23,42,.18),inset 0 1px 0 rgba(255,255,255,.08);animation:ctLoginFadeIn .65s cubic-bezier(.22,1,.36,1) .12s both}
.ct-login-aside::before{content:"";position:absolute;top:-100px;right:-80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(74,222,128,.30),transparent 70%);pointer-events:none;z-index:0;animation:ctSubtleFloat 6s ease-in-out infinite}
.ct-login-aside::after{content:"";position:absolute;bottom:-130px;left:-80px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(96,165,250,.18),transparent 70%);pointer-events:none;z-index:0}
.ct-login-aside>*{position:relative;z-index:1}
.ct-login-aside-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(ellipse 80% 50% at 50% 30%,black,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 80% 50% at 50% 30%,black,transparent 75%);pointer-events:none;z-index:0;opacity:.45}
.ct-login-aside-glyph{position:relative;width:54px;height:54px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(74,222,128,.35),rgba(34,197,94,.20));border:1px solid rgba(134,239,172,.40);color:#86EFAC;box-shadow:0 12px 28px -10px rgba(74,222,128,.50),inset 0 0 0 1px rgba(255,255,255,.08);margin-bottom:18px;animation:ctSubtleFloat 4.6s ease-in-out infinite}
.ct-login-aside-glyph::after{content:"";position:absolute;inset:-3px;border-radius:16px;border:1px solid rgba(134,239,172,.35);animation:ctRingPulseLogin 3s ease-out infinite;pointer-events:none}
.ct-login-aside-eyebrow{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:999px;background:rgba(134,239,172,.14);border:1px solid rgba(134,239,172,.30);font-family:${fb};font-size:10.5px;font-weight:700;color:#86EFAC;text-transform:uppercase;letter-spacing:.10em;margin-bottom:14px;width:max-content}
.ct-login-aside-title{margin:0 0 8px;font-family:${fd};font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.018em;line-height:1.18}
.ct-login-aside-sub{margin:0 0 22px;font-family:${fb};font-size:13px;color:rgba(229,231,235,.78);line-height:1.55}
.ct-login-stats{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.ct-login-stat{display:flex;align-items:center;gap:13px;padding:13px 14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.10);transition:transform 220ms cubic-bezier(.33,1,.68,1),background 220ms ease,border-color 220ms ease}
.ct-login-stat:hover{transform:translateX(4px);background:rgba(74,222,128,.10);border-color:rgba(134,239,172,.32)}
.ct-login-stat-ico{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(74,222,128,.30),rgba(34,197,94,.16));color:#86EFAC;border:1px solid rgba(134,239,172,.28);flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
.ct-login-stat-meta{display:flex;flex-direction:column;min-width:0}
.ct-login-stat-val{margin:0;font-family:${fm};font-size:20px;font-weight:800;color:#FFFFFF;line-height:1;letter-spacing:-0.01em}
.ct-login-stat-lbl{margin:2px 0 0;font-family:${fb};font-size:12px;color:rgba(229,231,235,.70);letter-spacing:.005em}
.ct-login-aside-foot{margin:18px 0 0;display:flex;align-items:center;gap:7px;padding-top:14px;border-top:1px dashed rgba(255,255,255,.10);font-family:${fb};font-size:11px;color:rgba(229,231,235,.60);line-height:1.45}
.ct-login-aside-foot-ico{color:#86EFAC;flex-shrink:0}

/* ─── Dark mode ─── */
:root[data-theme="dark"] .ct-login-card{background:rgba(17,24,39,.78);border-color:rgba(255,255,255,.10);box-shadow:0 30px 80px -32px rgba(0,0,0,.65),0 8px 24px -10px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.05)}
:root[data-theme="dark"] .ct-login-card::before{background:radial-gradient(circle,rgba(74,222,128,.22),transparent 70%)}
:root[data-theme="dark"] .ct-login-card::after{background:radial-gradient(circle,rgba(96,165,250,.18),transparent 70%)}
:root[data-theme="dark"] .ct-login-logo-text-title{color:var(--eco-text-strong)}
:root[data-theme="dark"] .ct-login-logo-text-sub{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-login-eyebrow{background:linear-gradient(135deg,rgba(74,222,128,.14),rgba(96,165,250,.12));border-color:rgba(74,222,128,.30);color:#86EFAC}
:root[data-theme="dark"] .ct-login-eyebrow-spark{color:#4ADE80}
:root[data-theme="dark"] .ct-login-title{color:var(--eco-text-strong)}
:root[data-theme="dark"] .ct-login-sub{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-login-trust{background:rgba(74,222,128,.10);border-color:rgba(74,222,128,.26);color:#86EFAC}
:root[data-theme="dark"] .ct-login-trust-dot{background:#4ADE80;box-shadow:0 0 0 3px rgba(74,222,128,.20),0 0 10px rgba(74,222,128,.55)}
:root[data-theme="dark"] .ct-login-foot{color:var(--eco-text-soft)}
:root[data-theme="dark"] .ct-login-banner-warn{background:rgba(250,204,21,.10);border-color:rgba(250,204,21,.30)}
:root[data-theme="dark"] .ct-login-banner-warn-ico{background:rgba(250,204,21,.18);color:#FCD34D}
:root[data-theme="dark"] .ct-login-banner-warn-title{color:#FDE68A}
:root[data-theme="dark"] .ct-login-banner-warn-desc{color:#FCD34D}

/* Aside dark mode (already dark — refine for AA contrast in dark theme) */
:root[data-theme="dark"] .ct-login-aside{background:linear-gradient(155deg,rgba(20,83,45,.96) 0%,rgba(7,40,22,.97) 55%,rgba(2,28,15,.98) 100%);border-color:rgba(74,222,128,.32);box-shadow:0 30px 80px -32px rgba(0,0,0,.65),0 8px 24px -10px rgba(0,0,0,.40),inset 0 1px 0 rgba(255,255,255,.06)}
:root[data-theme="dark"] .ct-login-aside::before{background:radial-gradient(circle,rgba(74,222,128,.34),transparent 70%)}
:root[data-theme="dark"] .ct-login-aside::after{background:radial-gradient(circle,rgba(96,165,250,.20),transparent 70%)}
:root[data-theme="dark"] .ct-login-stat:hover{background:rgba(74,222,128,.12);border-color:rgba(134,239,172,.36)}

@media (max-width: 920px){
  .ct-login-shell{flex-direction:column;width:min(460px,100%);align-items:stretch;border-radius:22px;overflow:hidden}
  .ct-login-aside{width:100%;border-left:none;border-top:1px solid rgba(255,255,255,.08)}
  .ct-login-shell > .ct-login-card{border-bottom-left-radius:0;border-top-right-radius:22px}
  .ct-login-shell > .ct-login-aside{border-top-left-radius:0;border-bottom-left-radius:22px;border-bottom-right-radius:22px;border-top-right-radius:0}
}
@media (max-width: 540px){
  .ct-login-card{padding:28px 24px 22px;border-radius:18px}
  .ct-login-aside{padding:24px 22px 22px;border-radius:18px}
  .ct-login-title{font-size:22px}
  .ct-login-sub{font-size:13px}
  .ct-login-aside-title{font-size:19px}
}

:root[data-motion="reduced"] .ct-bubble,
:root[data-motion="reduced"] .ct-login-logo,
:root[data-motion="reduced"] .ct-login-logo-mark,
:root[data-motion="reduced"] .ct-login-eyebrow-spark,
:root[data-motion="reduced"] .ct-login-title-spark,
:root[data-motion="reduced"] .ct-login-aside-glyph,
:root[data-motion="reduced"] .ct-login-aside::before{animation:none!important}
`;

const LOGIN_BUBBLES = [
  { size: 240, x: "6%",  y: "12%", color: "rgba(34,197,94,0.42)",  anim: "ctBubble1",  dur: 22, label: "Mide" },
  { size: 190, x: "80%", y: "8%",  color: "rgba(96,165,250,0.40)", anim: "ctBubble2",  dur: 19, label: "Reduce" },
  { size: 150, x: "12%", y: "72%", color: "rgba(234,179,8,0.36)",  anim: "ctBubble3",  dur: 24 },
  { size: 300, x: "70%", y: "60%", color: "rgba(74,222,128,0.32)", anim: "ctBubble4",  dur: 28, label: "Transforma" },
  { size: 110, x: "44%", y: "26%", color: "rgba(59,130,246,0.36)", anim: "ctBubble5",  dur: 20 },
  { size: 170, x: "86%", y: "42%", color: "rgba(139,92,246,0.32)", anim: "ctBubble6",  dur: 23, label: "Mide" },
  { size: 100, x: "8%",  y: "48%", color: "rgba(236,72,153,0.28)", anim: "ctBubble7",  dur: 21 },
  { size: 220, x: "48%", y: "80%", color: "rgba(34,197,94,0.30)",  anim: "ctBubble8",  dur: 26, label: "Reduce" },
  { size: 80,  x: "32%", y: "10%", color: "rgba(96,165,250,0.40)", anim: "ctBubble9",  dur: 17 },
  { size: 96,  x: "62%", y: "16%", color: "rgba(234,179,8,0.38)",  anim: "ctBubble10", dur: 18 },
];

function BubbleBackdrop() {
  return (
    <div className="ct-bubbles-stage" aria-hidden="true">
      {LOGIN_BUBBLES.map((b, i) => (
        <span
          key={i}
          className="ct-bubble"
          style={{
            width: b.size,
            height: b.size,
            left: b.x,
            top: b.y,
            background: `radial-gradient(circle at 35% 35%, ${b.color}, transparent 72%)`,
            animation: `${b.anim} ${b.dur}s cubic-bezier(.42,0,.58,1) ${i * -1.4}s infinite, ctBubblePulse ${b.dur / 2}s ease-in-out ${i * -0.7}s infinite`,
            filter: "blur(.5px)",
          }}
        >
          {b.label && (
            <span
              className="ct-bubble-label"
              style={{ fontSize: Math.max(13, Math.round(b.size * 0.13)) }}
            >
              {b.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [success, setSuccess] = useState(null) // null | account
  const [shaking, setShaking] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [flashToast, setFlashToast] = useState(null)
  const usingBackend = isUsingBackendAuth()

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passValid = password.length >= 6
  const errors = submitted ? {
    email: !email ? "Ingresa tu correo institucional" : !emailValid ? "Formato de correo inválido" : null,
    password: !password ? "Ingresa tu contraseña" : !passValid ? "Mínimo 6 caracteres" : null,
  } : {}

  const triggerShake = () => { setShaking(true); setTimeout(() => setShaking(false), 500) }

  const handleLogin = async () => {
    setSubmitted(true)
    setLoginError(null)
    if (!email || !emailValid || !password || !passValid) { triggerShake(); return }
    setLoading(true)
    try {
      const nextUser = await onLogin(
        { email: email.toLowerCase(), password },
        { commitDelayMs: 6500 }
      )
      setSuccess({
        name: nextUser?.fullName || nextUser?.name || nextUser?.email || "Usuario",
        role: nextUser?.roleKey || nextUser?.role || "operativo",
      })
    } catch (error) {
      setLoginError(error?.code || "credentials")
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    setSubmitted(true)
    if (!email || !emailValid) { triggerShake(); return }
    setLoading(true)
    setLoginError(null)
    try {
      await requestPasswordReset(email)
      setForgotSent(true)
    } catch (error) {
      setLoginError(error?.code || "credentials")
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { forgotMode ? handleForgot() : handleLogin() }
  }
  const errorMessages = {
    credentials: { title: "Datos incorrectos", desc: "El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo." },
    backend_not_configured: { title: "Sin conexión al servicio", desc: "No pudimos conectar en este momento. Comprueba tu conexión a internet e inténtalo otra vez." },
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.sessionStorage.getItem("carbontrack.flash")
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.title) setFlashToast(parsed)
      window.sessionStorage.removeItem("carbontrack.flash")
    } catch {}
  }, [location.key])

  useEffect(() => {
    if (!flashToast) return undefined
    const timer = setTimeout(() => setFlashToast(null), 2600)
    return () => clearTimeout(timer)
  }, [flashToast])

  /* ═══ SUCCESS ═══ */
  if (success) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--eco-primary-900)",
        animation: "eco-fadeIn 0.5s ease-out"
      }}>
        <div style={{
          textAlign: "center",
          padding: 40, animation: "eco-fadeInUp 0.5s cubic-bezier(0.34,1.56,0.64,1)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            margin: "0 auto 28px"
          }}>
            <FingerprintLoginAnimation />
          </div>
          <h1 style={{ fontFamily: fd, fontSize: 24, fontWeight: 800, color: "white", margin: "0 0 6px" }}>
            ¡Bienvenido, {success.name.split(" ")[0]}!
          </h1>
          <p style={{ fontFamily: fb, fontSize: 15, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            {success.role} · Instituto Tecnológico de El Mante
          </p>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6, marginTop: 20,
            color: "rgba(255,255,255,0.4)",
            fontFamily: fb,
            fontSize: 13
          }}>
            Cargando dashboard
            <span style={{ display: "flex", gap: 3 }}>
              {[0, 1, 2].map(i => <span key={i} style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--eco-primary-400)",
                animation: `eco-dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`
              }} />)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ LOGIN FORM ═══ */
  return (
    <div
      className="eco-pattern2 ct-login-stage"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + el.scrollTop;
        el.style.setProperty("--glow-x", x + "px");
        el.style.setProperty("--glow-y", y + "px");
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.setProperty("--glow-x", "-9999px");
        el.style.setProperty("--glow-y", "-9999px");
      }}
    >
      <style>{LOGIN_CSS}</style>
      <BubbleBackdrop />

      <div className="ct-login-shell">
      <div className="ct-login-card">
        {/* Flash toast (e.g. logout success) */}
        {flashToast && (
            <div style={{
              position: "absolute",
              top: 20,
              right: 20,
              left: 20,
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: "var(--eco-radius-lg)",
              boxShadow: "var(--eco-shadow-xl)",
              padding: "14px 16px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              animation: "eco-scaleIn 0.22s ease both",
              zIndex: 2
            }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "var(--eco-radius-sm)",
                background: "var(--eco-success-bg)",
                color: "var(--eco-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <CheckCircle2 size={15} />
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong)" }}>{flashToast.title}</p>
                <p style={{ margin: "3px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>{flashToast.message}</p>
              </div>
            </div>
          )}
          {/* Logo */}
          <div className="ct-login-logo">
            <div className="ct-login-logo-mark" aria-hidden="true">
              <Leaf size={22} color="white" />
            </div>
            <div>
              <span className="ct-login-logo-text-title">CarbonTrack</span>
              <span className="ct-login-logo-text-sub">Huella de carbono</span>
            </div>
          </div>

          {forgotMode ? (
            <div style={{ animation: "eco-fadeInUp 0.35s ease-out" }}>
              <span className="ct-login-eyebrow">
                <span className="ct-login-eyebrow-spark"><KeyRound size={11} strokeWidth={2.6} /></span>
                Recupera tu acceso
              </span>
              <h1 className="ct-login-title">Recuperar contraseña</h1>
              <p className="ct-login-sub">
                Escribe tu correo institucional y te enviaremos un enlace seguro para crear una nueva contraseña.
              </p>

              {forgotSent ? (
                <div style={{
                  background: "var(--eco-success-bg)",
                  border: "1px solid rgba(34,197,94,.30)",
                  borderRadius: "var(--eco-radius-md)",
                  padding: 16,
                  display: "flex",
                  gap: 12,
                  marginBottom: 20,
                  animation: "eco-fadeInUp 0.35s ease-out"
                }}>
                  <CheckCircle2 size={20} style={{
                    color: "var(--eco-success)",
                    flexShrink: 0,
                    marginTop: 1
                  }} />
                  <div>
                    <p style={{
                      fontFamily: fd,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--eco-text)",
                      margin: "0 0 2px"
                    }}>¡Listo, revisa tu correo!</p>
                    <p style={{
                      fontFamily: fb,
                      fontSize: 13,
                      color: "var(--eco-text-soft)",
                      margin: 0,
                      lineHeight: 1.45
                    }}>
                      Te enviamos un enlace a <strong>{email}</strong>. El enlace estará disponible los próximos 30 minutos.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ animation: shaking ? "eco-shake 0.5s ease-out" : "none" }}>
                  <FieldWrap label="Correo institucional" error={errors.email}>
                    <InputField type="email"
                      placeholder="usuario@itsmante.edu.mx"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setSubmitted(false) }}
                      onKeyDown={handleKeyDown}
                      error={!!errors.email}
                      focused={emailFocused}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      iconLeft={<Mail size={16} />} />
                  </FieldWrap>
                  <Btn onClick={handleForgot} loading={loading} animated>
                    {loading ? "Enviando enlace…" : "Enviar enlace de recuperación"}
                    {!loading && <ArrowRight size={16} />}
                  </Btn>
                </div>
              )}
              <button
                onClick={() => {
                  setForgotMode(false);
                  setForgotSent(false);
                  setSubmitted(false);
                  setLoginError(null)
                }}
                className="ct-login-back"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <div style={{ animation: "eco-fadeInUp 0.35s ease-out" }}>
              <span className="ct-login-eyebrow">
                <span className="ct-login-eyebrow-spark"><Sparkles size={11} strokeWidth={2.6} /></span>
                Bienvenido de vuelta
              </span>
              <h1 className="ct-login-title">¡Hola de nuevo!</h1>
              <p className="ct-login-sub">
                Inicia sesión para retomar tu trabajo en CarbonTrack y seguir midiendo el impacto de tu campus.
              </p>

              {!usingBackend && !loginError && (
                <div className="ct-login-banner-warn">
                  <div className="ct-login-banner-warn-ico">
                    <WifiOff size={15} strokeWidth={2.4} />
                  </div>
                  <div>
                    <p className="ct-login-banner-warn-title">Conexión no disponible</p>
                    <p className="ct-login-banner-warn-desc">
                      No pudimos comunicarnos con el servicio. Comprueba tu conexión e inténtalo otra vez.
                    </p>
                  </div>
                </div>
              )}

              {loginError && (
                <div style={{
                  background: "var(--eco-danger-bg)",
                  border: "1px solid rgba(220,38,38,.30)",
                  borderRadius: "var(--eco-radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  animation: "eco-fadeInUp 0.3s ease-out"
                }}>
                  <AlertCircle
                    size={18}
                    style={{
                      color: "var(--eco-danger)",
                      flexShrink: 0,
                      marginTop: 1
                    }} />
                  <div>
                    <p style={{
                      fontFamily: fd,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--eco-text)",
                      margin: "0 0 1px"
                    }}>{errorMessages[loginError].title}</p>
                    <p style={{
                      fontFamily: fb,
                      fontSize: 12,
                      color: "var(--eco-text-soft)",
                      margin: 0,
                      lineHeight: 1.45
                    }}>{errorMessages[loginError].desc}</p>
                  </div>
                </div>
              )}

              <div style={{ animation: shaking ? "eco-shake 0.5s ease-out" : "none" }}>
                <FieldWrap label="Correo institucional" error={errors.email}>
                  <InputField
                    type="email"
                    placeholder="usuario@itsmante.edu.mx"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setSubmitted(false);
                      setLoginError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    error={!!errors.email}
                    focused={emailFocused}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    iconLeft={<Mail size={16} />} />
                </FieldWrap>
                <FieldWrap
                  label="Contraseña"
                  error={errors.password}
                  style={{ marginBottom: 8 }}>
                  <InputField
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setSubmitted(false);
                      setLoginError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    error={!!errors.password}
                    focused={passFocused}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    iconLeft={<Lock size={16} />}
                    iconRight={<button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Ocultar" : "Mostrar"}
                      style={{
                        display: "flex",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: "var(--eco-gray-400)"
                      }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
                </FieldWrap>
              </div>

              <div className="ct-login-help-row">
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setSubmitted(false);
                    setLoginError(null)
                  }}
                  className="ct-login-help-link"
                >
                  <KeyRound size={12} strokeWidth={2.6} />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Btn onClick={handleLogin} loading={loading} animated>
                {loading ? "Verificando tus datos…" : "Iniciar sesión"}
                {!loading && <ArrowRight size={16} />}
              </Btn>

              <div className="ct-login-trust" role="status">
                <span className="ct-login-trust-dot" />
                <ShieldCheck size={13} strokeWidth={2.4} />
                Conexión segura · Tus datos viajan cifrados
              </div>
            </div>
          )}
          <p className="ct-login-foot">© 2026 Instituto Tecnológico Superior de El Mante</p>
      </div>

      <aside className="ct-login-aside" aria-label="Resumen del sistema">
        <span className="ct-login-aside-grid" aria-hidden="true" />
        <span className="ct-login-aside-eyebrow">
          <ShieldCheck size={11} strokeWidth={2.6} />
          Plataforma educativa
        </span>
        <h2 className="ct-login-aside-title">Tu campus, monitoreado al detalle.</h2>
        <p className="ct-login-aside-sub">
          Mide, reduce y transforma la huella de carbono de tu institución con datos verificables y trazables.
        </p>
        <ul className="ct-login-stats">
          <li className="ct-login-stat">
            <div className="ct-login-stat-ico"><Building2 size={16} strokeWidth={2.2} /></div>
            <div className="ct-login-stat-meta">
              <p className="ct-login-stat-val">18</p>
              <p className="ct-login-stat-lbl">Áreas medidas</p>
            </div>
          </li>
          <li className="ct-login-stat">
            <div className="ct-login-stat-ico"><BarChart3 size={16} strokeWidth={2.2} /></div>
            <div className="ct-login-stat-meta">
              <p className="ct-login-stat-val">2</p>
              <p className="ct-login-stat-lbl">Scopes activos</p>
            </div>
          </li>
          <li className="ct-login-stat">
            <div className="ct-login-stat-ico"><ShieldCheck size={16} strokeWidth={2.2} /></div>
            <div className="ct-login-stat-meta">
              <p className="ct-login-stat-val">100%</p>
              <p className="ct-login-stat-lbl">Trazable</p>
            </div>
          </li>
        </ul>
        <p className="ct-login-aside-foot">
          <CheckCircle2 size={13} strokeWidth={2.4} className="ct-login-aside-foot-ico" />
          Datos auditables alineados al estándar GHG Protocol.
        </p>
      </aside>
      </div>
    </div>
  )
}

/* ─── Subcomponents ─── */
function FieldWrap({ label, error, children, style: s }) {
  return (
    <div style={{ marginBottom: 16, ...s }}>
      {label && <label style={{
        fontFamily: fb,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--eco-gray-700)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 6
      }}>{label}
        <span style={{
          color: "var(--eco-danger)",
          fontSize: 11
        }}>*</span></label>}
      {children}
      {error && <p style={{
        fontFamily: fb,
        fontSize: 12,
        color: "var(--eco-danger)",
        margin: "5px 0 0",
        display: "flex",
        alignItems: "center",
        gap: 4,
        animation: "eco-fadeInUp 0.2s ease-out"
      }}>
        <AlertCircle size={12} /> {error}</p>}
    </div>
  )
}

function InputField({ type, placeholder, value, onChange, onKeyDown, error, focused, onFocus, onBlur, iconLeft, iconRight }) {
  const bc = error ? "var(--eco-danger)" : focused ? "var(--eco-primary-500)" : "var(--eco-gray-300)"
  const ring = error ? "0 0 0 2px rgba(220,38,38,0.08)" : focused ? "0 0 0 2px rgba(34,197,94,0.10)" : "none"
  return (
    <div style={{ position: "relative" }}>
      {iconLeft && <span style={{
        position: "absolute",
        left: 12,
        top: "50%",
        transform: "translateY(-50%)",
        color: focused ? "var(--eco-primary-500)" : "var(--eco-gray-400)",
        display: "flex",
        transition: "color 150ms",
        pointerEvents: "none"
      }}>{iconLeft}</span>}
      <input type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={type === "email" ? "email" : "current-password"}
        style={{
          width: "100%",
          height: 44, padding: `0 ${iconRight ? 42 : 14}px 0 ${iconLeft ? 40 : 14}px`,
          border: `1px solid ${bc}`,
          borderRadius: "var(--eco-radius-md)",
          fontFamily: fb,
          fontSize: 15, color: "var(--eco-gray-800)",
          background: "white",
          outline: "none",
          transition: "all 150ms ease-out",
          boxShadow: ring
        }} />
      {iconRight && <span style={{
        position: "absolute",
        right: 10, top: "50%", transform: "translateY(-50%)",
        display: "flex"
      }}>{iconRight}</span>}
    </div>
  )
}

function FingerprintLoginAnimation() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const start = () => {
      el.classList.remove("ct-fp-active")
      void el.offsetWidth
      el.classList.add("ct-fp-active")
    }
    const onEnd = (e) => {
      if (e.animationName === "ctFpContainer") start()
    }
    el.addEventListener("animationend", onEnd)
    const t = setTimeout(start, 60)
    return () => {
      clearTimeout(t)
      el.removeEventListener("animationend", onEnd)
    }
  }, [])

  const paths = [
    { c: "odd",  d: "m 25.117139,57.142857 c 0,0 -1.968558,-7.660465 -0.643619,-13.149003 1.324939,-5.488538 4.659682,-8.994751 4.659682,-8.994751" },
    { c: "odd",  d: "m 31.925369,31.477584 c 0,0 2.153609,-2.934998 9.074971,-5.105078 6.921362,-2.17008 11.799844,-0.618718 11.799844,-0.618718" },
    { c: "odd",  d: "m 57.131213,26.814448 c 0,0 5.127709,1.731228 9.899495,7.513009 4.771786,5.781781 4.772971,12.109204 4.772971,12.109204" },
    { c: "odd",  d: "m 72.334009,50.76769 0.09597,2.298098 -0.09597,2.386485" },
    { c: "even", d: "m 27.849282,62.75 c 0,0 1.286086,-1.279223 1.25,-4.25 -0.03609,-2.970777 -1.606117,-7.675266 -0.625,-12.75 0.981117,-5.074734 4.5,-9.5 4.5,-9.5" },
    { c: "even", d: "m 36.224282,33.625 c 0,0 8.821171,-7.174484 19.3125,-2.8125 10.491329,4.361984 11.870558,14.952665 11.870558,14.952665" },
    { c: "even", d: "m 68.349282,49.75 c 0,0 0.500124,3.82939 0.5625,5.8125 0.06238,1.98311 -0.1875,5.9375 -0.1875,5.9375" },
    { c: "odd",  d: "m 31.099282,65.625 c 0,0 1.764703,-4.224042 2,-7.375 0.235297,-3.150958 -1.943873,-9.276886 0.426777,-15.441942 2.370649,-6.165056 8.073223,-7.933058 8.073223,-7.933058" },
    { c: "odd",  d: "m 45.849282,33.625 c 0,0 12.805566,-1.968622 17,9.9375 4.194434,11.906122 1.125,24.0625 1.125,24.0625" },
    { c: "even", d: "m 59.099282,70.25 c 0,0 0.870577,-2.956221 1.1875,-4.5625 0.316923,-1.606279 0.5625,-5.0625 0.5625,-5.0625" },
    { c: "even", d: "m 60.901059,56.286612 c 0,0 0.903689,-9.415996 -3.801777,-14.849112 -3.03125,-3.5 -7.329245,-4.723939 -11.867187,-3.8125 -5.523438,1.109375 -7.570313,5.75 -7.570313,5.75" },
    { c: "even", d: "m 34.072577,68.846248 c 0,0 2.274231,-4.165782 2.839205,-9.033748 0.443558,-3.821814 -0.49394,-5.649939 -0.714206,-8.05386 -0.220265,-2.403922 0.21421,-4.63364 0.21421,-4.63364" },
    { c: "odd",  d: "m 37.774165,70.831845 c 0,0 2.692139,-6.147592 3.223034,-11.251208 0.530895,-5.103616 -2.18372,-7.95562 -0.153491,-13.647655 2.030229,-5.692035 8.108442,-4.538898 8.108442,-4.538898" },
    { c: "odd",  d: "m 54.391174,71.715729 c 0,0 2.359472,-5.427681 2.519068,-16.175068 0.159595,-10.747388 -4.375223,-12.993087 -4.375223,-12.993087" },
    { c: "even", d: "m 49.474282,73.625 c 0,0 3.730297,-8.451831 3.577665,-16.493718 -0.152632,-8.041887 -0.364805,-11.869326 -4.765165,-11.756282 -4.400364,0.113044 -3.875,4.875 -3.875,4.875" },
    { c: "even", d: "m 41.132922,72.334447 c 0,0 2.49775,-5.267079 3.181981,-8.883029 0.68423,-3.61595 0.353553,-9.413359 0.353553,-9.413359" },
    { c: "odd",  d: "m 45.161782,73.75 c 0,0 1.534894,-3.679847 2.40625,-6.53125 0.871356,-2.851403 1.28125,-7.15625 1.28125,-7.15625" },
    { c: "odd",  d: "m 48.801947,56.125 c 0,0 0.234502,-1.809418 0.109835,-3.375 -0.124667,-1.565582 -0.5625,-3.1875 -0.5625,-3.1875" },
  ]

  const fingerprintGroup = (
    <g className="ct-fp-fingerprint-out" fill="none" strokeWidth="2" strokeLinecap="round">
      {paths.map((p, i) => (
        <path key={i} className={`ct-fp-${p.c}`} d={p.d} />
      ))}
    </g>
  )

  return (
    <div ref={ref} className="ct-fp-container">
      <span className="ct-fp-text">¡Hola de nuevo!</span>
      <svg className="ct-fp-fingerprint ct-fp-fingerprint-base" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        {fingerprintGroup}
      </svg>
      <svg className="ct-fp-fingerprint ct-fp-fingerprint-active" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        {fingerprintGroup}
      </svg>
      <svg className="ct-fp-ok" xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <path d="M34.912 50.75l10.89 10.125L67 36.75" fill="none" stroke="#fff" strokeWidth="6" />
      </svg>
    </div>
  )
}

function Btn({ onClick, loading, children, animated = false }) {
  if (animated) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="example-2 eco-login-btn"
      >
        <span className="inner">
          {loading && <Loader2 size={18} style={{ animation: "eco-spin 0.8s linear infinite" }} />}
          {children}
        </span>
      </button>
    )
  }

  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%",
      height: 46,
      borderRadius: "var(--eco-radius-md)",
      background: loading ? "var(--eco-gray-300)" : "var(--eco-primary-500)",
      color: "white",
      border: "none",
      fontFamily: fb,
      fontSize: 15,
      fontWeight: 600,
      cursor: loading ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 200ms",
      boxShadow: loading ? "none" : "0 2px 8px rgba(34,197,94,0.25)"
    }}>
      {loading && <Loader2 size={18} style={{ animation: "eco-spin 0.8s linear infinite" }} />}
      {children}
    </button>
  )
}

