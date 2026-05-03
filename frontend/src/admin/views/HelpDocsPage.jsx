import React from "react";
import {
  LifeBuoy, BookOpen, FileText, HelpCircle, Sparkles, Layers,
  ClipboardEdit, Paperclip, CheckSquare, Cpu, FileBarChart, Target,
  Mail, Phone, MessageSquare, Ticket, ChevronDown, ChevronRight, Search,
  AlertCircle, Info, ExternalLink, Download, GitBranch, Calendar, Users,
  LayoutDashboard, Database, Calculator, FlaskConical,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminFilterBar from "../components/AdminFilterBar";
import {
  helpQuickGuides, helpManuals, helpFaq, helpModules,
  helpCommonErrors, helpVersion, helpChangelog, helpSupportContact,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const GUIDE_ICON = {
  ClipboardEdit, Paperclip, CheckSquare, Cpu, FileBarChart, Target,
};

const MODULE_ICON = {
  LayoutDashboard, Database, Calculator, FlaskConical, Cpu,
  Target, FileBarChart, Sparkles, Users,
};

const CONTACT_ICON = { Mail, Phone, MessageSquare, Ticket };

const LEVEL_COLOR = {
  basic:        { color: "#16A34A", label: "Básico" },
  intermediate: { color: "#CA8A04", label: "Intermedio" },
  advanced:     { color: "#DC2626", label: "Avanzado" },
};

export default function HelpDocsPage() {
  const [tab, setTab] = React.useState("overview");
  const [search, setSearch] = React.useState("");
  const [faqCategory, setFaqCategory] = React.useState("all");
  const [openFaq, setOpenFaq] = React.useState(null);

  const faqCategories = React.useMemo(
    () => [...new Set(helpFaq.map(f => f.category))],
    []
  );

  const filteredFaq = helpFaq.filter(f => {
    const q = search.trim().toLowerCase();
    if (faqCategory !== "all" && f.category !== faqCategory) return false;
    if (q && !f.question.toLowerCase().includes(q) && !f.answer.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div>
      <AdminPageHeader
        icon={LifeBuoy}
        title="Ayuda y documentación"
        subtitle="Guías, manuales, preguntas frecuentes y soporte técnico."
        breadcrumb={["Soporte", "Ayuda"]}
        actions={
          <button style={primaryBtn}>
            <ExternalLink size={14} /> Portal de soporte
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "overview",  label: "Inicio" },
          { id: "guides",    label: "Guías rápidas",   count: helpQuickGuides.length },
          { id: "manuals",   label: "Manuales",        count: helpManuals.length },
          { id: "modules",   label: "Módulos" },
          { id: "faq",       label: "Preguntas frecuentes", count: helpFaq.length },
          { id: "errors",    label: "Errores comunes", count: helpCommonErrors.length },
          { id: "contact",   label: "Contacto" },
          { id: "changelog", label: "Versiones" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ── Overview ───────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Hero */}
          <div style={{
            background: "linear-gradient(135deg, rgba(34,197,94,.12), rgba(34,197,94,.02))",
            border: "1px solid rgba(34,197,94,.20)",
            borderRadius: 14, padding: "22px 24px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "rgba(34,197,94,.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <LifeBuoy size={26} color="var(--eco-primary-600, #16A34A)" />
            </div>
            <div>
              <div style={{ fontFamily: fd, fontSize: 17, fontWeight: 800, color: "var(--eco-text)" }}>
                ¿Cómo podemos ayudarte hoy?
              </div>
              <div style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft)", marginTop: 4 }}>
                Encuentra guías paso a paso, manuales completos, respuestas rápidas o contacta a nuestro equipo de soporte.
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}>
            <ShortcutCard icon={BookOpen} label="Guía rápida" desc="Comienza en 5 minutos." onClick={() => setTab("guides")} />
            <ShortcutCard icon={FileText} label="Manuales" desc="Documentación completa." onClick={() => setTab("manuals")} />
            <ShortcutCard icon={HelpCircle} label="Preguntas frecuentes" desc="Resuelve dudas comunes." onClick={() => setTab("faq")} />
            <ShortcutCard icon={Mail} label="Contactar soporte" desc="Habla con nuestro equipo." onClick={() => setTab("contact")} />
          </div>

          {/* Version banner */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}>
            <div style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{
                fontFamily: fb, fontSize: 11, fontWeight: 600,
                color: "var(--eco-text-soft)",
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                Versión actual
              </div>
              <div style={{
                fontFamily: fm, fontSize: 24, fontWeight: 700,
                color: "var(--eco-text)", marginTop: 4,
              }}>
                v{helpVersion.current}
              </div>
              <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 4 }}>
                <Calendar size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
                {helpVersion.releasedAt}{" · "}
                <span style={{ fontFamily: fm }}>{helpVersion.buildHash}</span>
              </div>
            </div>
            <div style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <div style={{
                fontFamily: fb, fontSize: 11, fontWeight: 600,
                color: "var(--eco-text-soft)",
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>
                Última actualización
              </div>
              <div style={{
                fontFamily: fb, fontSize: 14, fontWeight: 600,
                color: "var(--eco-text)", marginTop: 6, lineHeight: 1.4,
              }}>
                {helpChangelog[0].changes[0]}
              </div>
              <button onClick={() => setTab("changelog")} style={{
                marginTop: 8, padding: "5px 10px", borderRadius: 6,
                border: "1px solid var(--eco-border)",
                background: "var(--eco-card-muted)",
                fontFamily: fb, fontSize: 11.5, fontWeight: 600,
                color: "var(--eco-text)", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}>
                <GitBranch size={11} /> Ver historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick guides ──────────────────────────────────────── */}
      {tab === "guides" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {helpQuickGuides.map(g => {
            const Icon = GUIDE_ICON[g.icon] || BookOpen;
            const lvl = LEVEL_COLOR[g.level];
            return (
              <div key={g.id} style={cardHover}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={iconBox}><Icon size={17} color="var(--eco-primary-600)" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 700, color: "var(--eco-text)" }}>
                      {g.title}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginTop: 12,
                  paddingTop: 10, borderTop: "1px solid var(--eco-border)",
                }}>
                  <span style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
                    {g.steps} pasos · {g.time}
                  </span>
                  <span style={{
                    marginLeft: "auto",
                    fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 10,
                    background: `${lvl.color}14`, color: lvl.color,
                  }}>
                    {lvl.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Manuals ───────────────────────────────────────────── */}
      {tab === "manuals" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 12,
        }}>
          {helpManuals.map(m => (
            <div key={m.id} style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 42, height: 52, borderRadius: 6,
                  background: "var(--eco-card-muted)",
                  border: "1px solid var(--eco-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <FileText size={20} color="var(--eco-primary-600)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "inline-block",
                    fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 10,
                    background: "rgba(34,197,94,.10)",
                    color: "var(--eco-primary-700, #15803D)",
                    textTransform: "uppercase", letterSpacing: ".04em",
                    marginBottom: 5,
                  }}>
                    {m.audience}
                  </span>
                  <div style={{ fontFamily: fd, fontSize: 14.5, fontWeight: 800, color: "var(--eco-text)" }}>
                    {m.title}
                  </div>
                  <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 4, lineHeight: 1.45 }}>
                    {m.description}
                  </div>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 10, borderTop: "1px solid var(--eco-border)",
              }}>
                <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                  {m.pages} pp. · actualizado {m.updatedAt}
                </span>
                <button style={primaryBtn}>
                  <Download size={13} /> Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modules ───────────────────────────────────────────── */}
      {tab === "modules" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}>
          {helpModules.map(m => {
            const Icon = MODULE_ICON[m.icon] || BookOpen;
            return (
              <div key={m.id} style={cardHover}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={iconBox}><Icon size={17} color="var(--eco-primary-600)" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 700, color: "var(--eco-text)" }}>
                      {m.label}
                    </div>
                    <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 4, lineHeight: 1.45 }}>
                      {m.summary}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scope explanation */}
          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <SectionTitle icon={Layers} text="Explicación de scopes" />
            <div style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, overflow: "hidden",
            }}>
              {[
                { code: "Scope 1", color: "#DC2626", label: "Emisiones directas",
                  text: "Combustión en fuentes propias o controladas: gas natural, diésel, gasolina, refrigerantes." },
                { code: "Scope 2", color: "#2563EB", label: "Emisiones indirectas por energía",
                  text: "Generadas por la electricidad, vapor, calor o frío comprados." },
                { code: "Scope 3", color: "#7C3AED", label: "Otras emisiones indirectas",
                  text: "Cadena de valor: viajes, transporte, residuos, bienes y servicios." },
              ].map((s, i, arr) => (
                <div key={s.code} style={{
                  padding: "14px 18px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--eco-border)" : "none",
                  display: "grid", gridTemplateColumns: "auto 1fr", gap: 14,
                }}>
                  <div style={{
                    fontFamily: fd, fontSize: 13, fontWeight: 800,
                    padding: "4px 12px", borderRadius: 8,
                    background: `${s.color}14`, color: s.color,
                    height: "fit-content", whiteSpace: "nowrap",
                  }}>
                    {s.code}
                  </div>
                  <div>
                    <div style={{ fontFamily: fb, fontSize: 13, fontWeight: 600, color: "var(--eco-text)" }}>
                      {s.label}
                    </div>
                    <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 4 }}>
                      {s.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <SectionTitle icon={FlaskConical} text="Factores de emisión" />
            <div style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
              fontFamily: fb, fontSize: 13, color: "var(--eco-text)",
              lineHeight: 1.6,
            }}>
              Un <strong>factor de emisión</strong> es el coeficiente que convierte un consumo (kWh, litros, m³, kg)
              en su equivalente en kg o toneladas de CO₂. Cada factor tiene una vigencia y una fuente
              (oficial nacional, IPCC, GHG Protocol). Cuando un factor expira, las nuevas capturas
              utilizan automáticamente la versión más reciente vigente. Si no hay versión vigente, el cálculo
              se bloquea y el sistema genera una alerta crítica.
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <SectionTitle icon={ClipboardEdit} text="Cómo capturar registros" />
            <div style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 20px",
            }}>
              <ol style={{
                margin: 0, paddingLeft: 20,
                fontFamily: fb, fontSize: 13, color: "var(--eco-text)",
                lineHeight: 1.7,
              }}>
                <li>Abre el módulo <strong>Capturar</strong> y elige el campus y área.</li>
                <li>Selecciona el dispositivo o fuente de consumo.</li>
                <li>Ingresa la lectura del periodo (siempre con la unidad correcta).</li>
                <li>Adjunta la evidencia (factura, foto del medidor, recibo).</li>
                <li>Guarda. El registro queda <em>pendiente</em> hasta su validación.</li>
                <li>El sistema calcula automáticamente las emisiones aplicando el factor vigente.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── FAQ ───────────────────────────────────────────────── */}
      {tab === "faq" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminFilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar en preguntas frecuentes…"
            filters={[{
              key: "category",
              label: "Categoría",
              options: faqCategories.map(c => ({ value: c, label: c })),
            }]}
            filterValues={{ category: faqCategory }}
            onFilterChange={(_, v) => setFaqCategory(v)}
            onClear={() => { setSearch(""); setFaqCategory("all"); }}
          />

          <div style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {filteredFaq.length === 0 ? (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft)",
              }}>
                No se encontraron preguntas con esos filtros.
              </div>
            ) : filteredFaq.map((f, i) => {
              const open = openFaq === f.id;
              return (
                <div key={f.id} style={{
                  borderBottom: i < filteredFaq.length - 1 ? "1px solid var(--eco-border)" : "none",
                }}>
                  <button
                    onClick={() => setOpenFaq(open ? null : f.id)}
                    style={{
                      width: "100%", padding: "14px 18px",
                      background: "transparent", border: "none",
                      display: "flex", alignItems: "center", gap: 12,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {open ? <ChevronDown size={14} color="var(--eco-text-soft)" /> : <ChevronRight size={14} color="var(--eco-text-soft)" />}
                    <span style={{
                      fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 10,
                      background: "var(--eco-card-muted)",
                      color: "var(--eco-text-soft)",
                      textTransform: "uppercase", letterSpacing: ".04em",
                    }}>
                      {f.category}
                    </span>
                    <span style={{ flex: 1, fontFamily: fb, fontSize: 13.5, fontWeight: 600, color: "var(--eco-text)" }}>
                      {f.question}
                    </span>
                  </button>
                  {open && (
                    <div style={{
                      padding: "0 18px 18px 44px",
                      fontFamily: fb, fontSize: 12.5,
                      color: "var(--eco-text-soft)", lineHeight: 1.6,
                    }}>
                      {f.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Errors ───────────────────────────────────────────── */}
      {tab === "errors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {helpCommonErrors.map(e => (
            <div key={e.id} style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderRadius: 12, padding: "14px 18px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 9,
                background: "rgba(239,68,68,.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertCircle size={17} color="var(--eco-danger, #DC2626)" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 700, color: "var(--eco-text)" }}>
                    {e.title}
                  </span>
                  <span style={{
                    fontFamily: fm, fontSize: 10.5, fontWeight: 700,
                    padding: "1px 7px", borderRadius: 6,
                    background: "var(--eco-card-muted)",
                    color: "var(--eco-text-soft)",
                  }}>
                    {e.code}
                  </span>
                </div>
                <div style={{
                  fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)",
                  marginTop: 4, lineHeight: 1.5,
                }}>
                  {e.description}
                </div>
              </div>
              <button style={secondaryBtn}>
                {e.action} <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Contact ──────────────────────────────────────────── */}
      {tab === "contact" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(34,197,94,.10), rgba(34,197,94,.02))",
            border: "1px solid rgba(34,197,94,.20)",
            borderRadius: 14, padding: "20px 24px",
          }}>
            <div style={{ fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text)" }}>
              Contacto de soporte CarbonTrack
            </div>
            <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft)", marginTop: 4 }}>
              Horario de atención: <strong>{helpSupportContact.hours}</strong>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {helpSupportContact.channels.map(ch => {
              const Icon = CONTACT_ICON[ch.icon] || Mail;
              return (
                <div key={ch.id} style={cardHover}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: "rgba(34,197,94,.10)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Icon size={18} color="var(--eco-primary-600)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>{ch.label}</div>
                      <div style={{
                        fontFamily: fm, fontSize: 13, fontWeight: 700,
                        color: "var(--eco-text)", marginTop: 2,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {ch.value}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: 12, padding: "20px 22px",
          }}>
            <SectionTitle icon={Ticket} text="Crear un ticket" />
            <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft)", marginBottom: 14 }}>
              Describe brevemente el problema, el módulo y la fecha aproximada en que ocurrió.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <input placeholder="Asunto" style={inputStyle} />
              <select style={inputStyle}>
                <option>Módulo afectado…</option>
                <option>Captura</option>
                <option>Reportes</option>
                <option>Dispositivos</option>
                <option>Otro</option>
              </select>
              <textarea placeholder="Describe el problema…" rows={4} style={{ ...inputStyle, gridColumn: "1 / -1", resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button style={secondaryBtn}>Cancelar</button>
              <button style={primaryBtn}><Ticket size={13} /> Enviar ticket</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Changelog ───────────────────────────────────────── */}
      {tab === "changelog" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}>
            <SummaryStat label="Versión" value={`v${helpVersion.current}`} />
            <SummaryStat label="Canal" value={helpVersion.channel} />
            <SummaryStat label="API" value={helpVersion.apiVersion} mono />
            <SummaryStat label="DB" value={helpVersion.dbVersion} mono />
          </div>

          {helpChangelog.map((rel, i) => (
            <div key={rel.id} style={{
              background: "var(--eco-card)",
              border: "1px solid var(--eco-border)",
              borderLeft: i === 0 ? "3px solid var(--eco-primary-500, #22C55E)" : "3px solid var(--eco-border)",
              borderRadius: 12, padding: "16px 22px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontFamily: fm, fontSize: 14, fontWeight: 700,
                  color: i === 0 ? "var(--eco-primary-600)" : "var(--eco-text)",
                }}>
                  v{rel.version}
                </span>
                {i === 0 && (
                  <span style={{
                    fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 10,
                    background: "rgba(34,197,94,.10)",
                    color: "var(--eco-primary-700, #15803D)",
                    textTransform: "uppercase", letterSpacing: ".04em",
                  }}>
                    Actual
                  </span>
                )}
                <span style={{
                  marginLeft: "auto",
                  fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)",
                }}>
                  {rel.date}
                </span>
              </div>
              <ul style={{
                margin: 0, paddingLeft: 18,
                fontFamily: fb, fontSize: 13, color: "var(--eco-text)",
                lineHeight: 1.7,
              }}>
                {rel.changes.map((c, j) => <li key={j}>{c}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function ShortcutCard({ icon: Icon, label, desc, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...cardHover,
      width: "100%", textAlign: "left", border: "1px solid var(--eco-border)",
      cursor: "pointer", background: "var(--eco-card)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={iconBox}><Icon size={17} color="var(--eco-primary-600)" /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: fd, fontSize: 13.5, fontWeight: 700, color: "var(--eco-text)" }}>{label}</div>
          <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 2 }}>{desc}</div>
        </div>
        <ChevronRight size={14} color="var(--eco-text-soft)" />
      </div>
    </button>
  );
}

function SectionTitle({ icon: Icon, text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 10,
    }}>
      {Icon && <Icon size={15} color="var(--eco-primary-500)" />}
      <span style={{
        fontFamily: fd, fontSize: 13, fontWeight: 700,
        color: "var(--eco-text)",
        textTransform: "uppercase", letterSpacing: ".04em",
      }}>{text}</span>
    </div>
  );
}

function SummaryStat({ label, value, mono }) {
  return (
    <div style={{
      background: "var(--eco-card)",
      border: "1px solid var(--eco-border)",
      borderRadius: 12, padding: "12px 16px",
    }}>
      <div style={{
        fontFamily: fb, fontSize: 10.5, fontWeight: 600,
        color: "var(--eco-text-soft)",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? fm : fb, fontSize: 16, fontWeight: 700,
        color: "var(--eco-text)", marginTop: 4,
      }}>{value}</div>
    </div>
  );
}

const cardHover = {
  background: "var(--eco-card)",
  border: "1px solid var(--eco-border)",
  borderRadius: 12, padding: "14px 18px",
  display: "flex", flexDirection: "column", gap: 8,
  transition: "all .18s ease",
  cursor: "default",
};

const iconBox = {
  width: 36, height: 36, borderRadius: 9,
  background: "rgba(34,197,94,.08)",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};

const inputStyle = {
  padding: "9px 12px",
  fontFamily: fb, fontSize: 13,
  background: "var(--eco-surface, #fff)",
  color: "var(--eco-text)",
  border: "1px solid var(--eco-border)",
  borderRadius: 8, outline: "none",
  width: "100%", boxSizing: "border-box",
};

const primaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 16px", borderRadius: 8, border: "none",
  background: "var(--eco-primary-500, #22C55E)", color: "#fff",
  fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 1px 3px rgba(34,197,94,.25)",
};

const secondaryBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: 8,
  border: "1px solid var(--eco-border)",
  background: "var(--eco-card)", color: "var(--eco-text)",
  fontFamily: fb, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
};
