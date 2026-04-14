import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Leaf, Mail, Lock,
  Eye, EyeOff, Loader2,
  ArrowRight, CheckCircle2, AlertCircle,
  Zap, Flame, TreePine,
  BarChart3, Shield, Building2
} from 'lucide-react'
import './Animations.css'
import './BackgroundPatterns/FingerprintLoginAnimation.css'
import { isUsingBackendAuth, requestPasswordReset } from '../api/auth'

const fd = "var(--eco-font-display)"
const fb = "var(--eco-font-body)"
const fm = "var(--eco-font-mono)"

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
    credentials: { title: "Credenciales incorrectas", desc: "El correo o la contraseña no coinciden. Verifica e intenta de nuevo." },
    backend_not_configured: { title: "Backend no disponible", desc: "La autenticación requiere una API configurada y accesible." },
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
      className="eco-pattern2"
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
      style={{ minHeight: "100vh", display: "flex" }}>
      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: 1000,
        margin: "auto",
        borderRadius: "var(--eco-radius-xl)", overflow: "hidden",
        boxShadow: "var(--eco-shadow-xl)", border: "1px solid var(--eco-border)",
        background: "white", animation: "eco-fadeInUp 0.6s cubic-bezier(0.33,1,0.68,1)",
      }}>

        {/* LEFT - FORM */}
        <div style={{
          flex: "0 0 440px",
          padding: "40px 40px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative"
        }}>
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
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 32
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "var(--eco-radius-md)",
              background: "var(--eco-primary-500)",
              display: "flex", alignItems: "center",
              justifyContent: "center"
            }}>
              <Leaf size={22} color="white" />
            </div>
            <div>
              <p style={{
                fontFamily: fd,
                fontSize: 18,
                fontWeight: 800,
                color: "var(--eco-gray-900)",
                margin: 0,
                lineHeight: 1.1
              }}>CarbonTrack</p>
              <p style={{
                fontFamily: fb,
                fontSize: 11,
                color: "var(--eco-gray-400)",
                margin: 0,
                letterSpacing: "0.06em"
              }}>HUELLA DE CARBONO</p>
            </div>
          </div>

          {forgotMode ? (
            <div style={{ animation: "eco-fadeInUp 0.35s ease-out" }}>
              <h1 style={{
                fontFamily: fd,
                fontSize: 22,
                fontWeight: 800,
                color: "var(--eco-gray-900)",
                margin: "0 0 6px"
              }}>Recuperar contraseña</h1>
              <p style={{
                fontFamily: fb,
                fontSize: 14,
                color: "var(--eco-gray-500)",
                margin: "0 0 24px",
                lineHeight: 1.5
              }}>Ingresa tu correo institucional y te enviaremos un enlace para restablecer tu contraseña.</p>

              {forgotSent ? (
                <div style={{
                  background: "var(--eco-success-bg)",
                  border: "1px solid #BBF7D0",
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
                      fontWeight: 600,
                      color: "var(--eco-gray-800)",
                      margin: "0 0 2px"
                    }}>Correo enviado</p>
                    <p style={{
                      fontFamily: fb,
                      fontSize: 13,
                      color: "var(--eco-gray-600)",
                      margin: 0,
                      lineHeight: 1.4
                    }}>Revisa tu bandeja en <strong>
                        {email}
                      </strong>. El enlace expira en 30 minutos.</p>
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
                      iconLeft={<Mail
                        size={16} />} />
                  </FieldWrap>
                  <Btn onClick={handleForgot}
                    loading={loading}>Enviar enlace <ArrowRight
                      size={16} /></Btn>
                </div>
              )}
              <button onClick={() => {
                setForgotMode(false);
                setForgotSent(false);
                setSubmitted(false);
                setLoginError(null)
              }}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "8px 0",
                  fontFamily: fb,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--eco-primary-600)",
                  background: "none",
                  border: "none",
                  cursor: "pointer"
                }}>← Volver al inicio de sesión</button>
            </div>
          ) : (
            <div style={{ animation: "eco-fadeInUp 0.35s ease-out" }}>
              <h1 style={{
                fontFamily: fd,
                fontSize: 22,
                fontWeight: 800,
                color: "var(--eco-gray-900)",
                margin: "0 0 6px"
              }}>Iniciar sesión</h1>
              <p style={{
                fontFamily: fb,
                fontSize: 14,
                color: "var(--eco-gray-500)",
                margin: "0 0 24px",
                lineHeight: 1.5
              }}>
                {usingBackend
                  ? "Accede con tus credenciales del backend configurado."
                  : "La autenticacion requiere una conexion activa con el backend configurado."}
              </p>

              {loginError && (
                <div style={{
                  background: "var(--eco-danger-bg)",
                  border: "1px solid #FECACA",
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
                      fontWeight: 600,
                      color: "var(--eco-gray-800)",
                      margin: "0 0 1px"
                    }}>{errorMessages[loginError].title}</p>
                    <p style={{
                      fontFamily: fb,
                      fontSize: 12,
                      color: "var(--eco-gray-600)",
                      margin: 0
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

              <div style={{ textAlign: "right", marginBottom: 20 }}>
                <button onClick={() => {
                  setForgotMode(true);
                  setSubmitted(false);
                  setLoginError(null)
                }}
                  style={{
                    fontFamily: fb,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--eco-primary-600)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0
                  }}>¿Olvidaste tu contraseña?</button>
              </div>

              <Btn onClick={handleLogin} loading={loading} animated>
                {loading ? "Verificando…" : "Iniciar sesión"}
                {!loading && <ArrowRight size={16} />}
              </Btn>

              {/* Demo accounts */}
              <div style={{
                marginTop: 24,
                padding: "14px 16px",
                background: usingBackend ? "var(--eco-card-muted)" : "var(--eco-warning-bg)",
                border: `1px solid ${usingBackend ? "var(--eco-border)" : "#FDE68A"}`,
                borderRadius: "var(--eco-radius-md)"
              }}>
                <p style={{
                  fontFamily: fb,
                  fontSize: 12,
                  fontWeight: 600,
                  color: usingBackend ? "var(--eco-text)" : "var(--eco-secondary-600)",
                  margin: "0 0 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}><Shield size={13} /> {usingBackend ? "Autenticación remota" : "Backend requerido"}</p>
                <p style={{
                  fontFamily: fb,
                  fontSize: 11,
                  color: "var(--eco-text-soft)",
                  margin: 0,
                  lineHeight: 1.55
                }}>
                  {usingBackend
                    ? "La sesion se valida contra el backend configurado y sus credenciales activas."
                    : "Sin backend disponible no se inventan usuarios ni datos locales; verifica la configuracion de la API."}
                </p>
              </div>
            </div>
          )}
          <p style={{
            fontFamily: fb,
            fontSize: 11,
            color: "var(--eco-gray-400)",
            margin: "24px 0 0",
            textAlign: "center"
          }}>© 2026 Instituto Tecnológico Superior de El Mante</p>
        </div>

        {/* RIGHT - HERO */}
        <div style={{
          flex: 1,
          minHeight: 560,
          background: "linear-gradient(135deg, var(--eco-primary-900) 0%, #0C2E1A 50%, var(--eco-gray-900) 100%)",
          backgroundSize: "200% 200%",
          animation: "eco-gradientShift 12s ease infinite",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            top: "10%",
            left: "8%",
            animation: "eco-float1 6s ease-in-out infinite"
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: "var(--eco-radius-lg)",
              background: "rgba(34,197,94,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Zap size={22} style={{
                color: "var(--eco-primary-400)",
                opacity: 0.7
              }} />

            </div>
          </div>

          <div style={{
            position: "absolute",
            top: "55%",
            right: "10%",
            animation: "eco-float2 7s ease-in-out infinite 1s"
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "var(--eco-radius-lg)",
              background: "rgba(234,179,8,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={20} style={{ color: "#EAB308", opacity: 0.6 }} />

            </div>
          </div>

          <div style={{
            position: "absolute",
            bottom: "15%",
            left: "15%",
            animation: "eco-float3 8s ease-in-out infinite 0.5s"
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "var(--eco-radius-lg)",
              background: "rgba(34,197,94,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <TreePine size={18} style={{
                color: "var(--eco-primary-300)",
                opacity: 0.6
              }} />

            </div>
          </div>

          <div style={{
            position: "absolute",
            bottom: "35%",
            right: "12%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.04)"
          }} />

          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            overflow: "hidden"
          }}>
            {[
              { text: "Mide", anim: "eco-dvdA 11s linear infinite", fadeDelay: "0s" },
              { text: "Reduce", anim: "eco-dvdB 12.6s linear infinite", fadeDelay: "1.2s" },
              { text: "Transforma", anim: "eco-dvdC 13.8s linear infinite", fadeDelay: "2.1s" },
            ].map((tag) => (
              <span
                key={tag.text}
                style={{
                  position: "absolute",
                  padding: "6px 12px",
                  borderRadius: "var(--eco-radius-full)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(4px)",
                  fontFamily: fd,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                  opacity: 0.72,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                  animation: `${tag.anim}, eco-bubbleFade 5.2s ease-in-out ${tag.fadeDelay} infinite`,
                  boxShadow: "0 8px 18px rgba(3,7,18,0.22)"
                }}
              >
                {tag.text}
              </span>
            ))}
          </div>

          <div style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            maxWidth: 380
          }}>
            <div style={{
              width: 70,
              height: 70,
              borderRadius: "var(--eco-radius-xl)",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px"
            }}>
              <Leaf size={40} style={{ color: "var(--eco-primary-400)" }} />
            </div>
            <p style={{
              fontFamily: fb,
              fontSize: 15,
              color: "rgba(255,255,255,0.5)",
              margin: "0 0 32px",
              lineHeight: 1.6
            }}>Sistema de monitoreo y trazabilidad de huella de carbono para Instituciones Educativas.</p>
            <div style={{
              display: "flex",
              gap: 20,
              justifyContent: "center"
            }}>
              {[{ val: "18", label: "Áreas", icon: <Building2 size={14} /> },
              { val: "2", label: "Scopes", icon: <BarChart3 size={14} /> },
              { val: "100%", label: "Trazable", icon: <Shield size={14} /> }].map((s, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4
                }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--eco-radius-md)",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--eco-primary-400)"
                  }}>{s.icon}</div>
                  <span style={{
                    fontFamily: fm,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "white"
                  }}>{s.val}</span>
                  <span style={{
                    fontFamily: fb,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)"
                  }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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

