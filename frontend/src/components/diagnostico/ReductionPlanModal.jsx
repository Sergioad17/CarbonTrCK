import React from "react";
import {
  Target, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle,
} from "lucide-react";
import DiagModalShell, {
  FieldLabel, TextInput, SelectInput, DateInput,
  ModalPrimaryBtn, ModalSecondaryBtn,
} from "./DiagModalShell";
import {
  uid, appendItem, KEYS, AI,
} from "./helpers";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const PERIOD_OPTIONS = [
  { value: "1m",   label: "1 mes"     },
  { value: "3m",   label: "3 meses"   },
  { value: "6m",   label: "6 meses"   },
  { value: "12m",  label: "12 meses"  },
  { value: "custom", label: "Personalizado" },
];

const STEPS = [
  { id: 1, label: "Datos generales"      },
  { id: 2, label: "Acciones recomendadas" },
  { id: 3, label: "Resumen"               },
];

export default function ReductionPlanModal({
  open, recommendations = [], onClose, onCreated,
}) {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState(() => initialForm());
  const [selected, setSelected] = React.useState({});
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(initialForm());
    setSelected(Object.fromEntries(recommendations.map(r => [r.id, true])));
    setError("");
  }, [open, recommendations]);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const totalImpact = React.useMemo(() => {
    let total = 0;
    recommendations.forEach(r => {
      if (!selected[r.id]) return;
      const m = String(r.impact || "").match(/([\d.]+)/);
      if (m) total += Number(m[1]);
    });
    return total;
  }, [recommendations, selected]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const overallPriority = React.useMemo(() => {
    const sel = recommendations.filter(r => selected[r.id]);
    if (sel.some(r => r.priority === "high")) return "Alta";
    if (sel.some(r => r.priority === "medium")) return "Media";
    if (sel.length) return "Baja";
    return "—";
  }, [recommendations, selected]);

  function next() {
    if (step === 1) {
      if (!form.name.trim()) {
        setError("El nombre del plan es obligatorio.");
        return;
      }
      setError("");
    }
    setStep(s => Math.min(3, s + 1));
  }
  function back() {
    setError("");
    setStep(s => Math.max(1, s - 1));
  }

  function handleCreate() {
    if (!form.name.trim()) {
      setStep(1);
      setError("El nombre del plan es obligatorio.");
      return;
    }
    const plan = {
      id: uid("plan"),
      name: form.name.trim(),
      period: form.period,
      customPeriod: form.period === "custom" ? form.customPeriod : null,
      targetReduction: form.targetReduction.trim(),
      responsible: form.responsible.trim(),
      selectedRecommendations: recommendations
        .filter(r => selected[r.id])
        .map(r => ({ id: r.id, title: r.title, impact: r.impact, priority: r.priority })),
      estimatedImpact: totalImpact > 0 ? `~${totalImpact.toFixed(1)} tCO₂e` : "—",
      priority: overallPriority,
      status: "activo",
      createdAt: new Date().toISOString(),
      origin: "diagnostico-inteligente",
    };
    appendItem(KEYS.reductionPlans, plan);
    onCreated?.(plan);
  }

  return (
    <DiagModalShell
      open={open}
      onClose={onClose}
      icon={Target}
      title="Crear plan de reducción"
      subtitle="Convertir el diagnóstico en un plan accionable y rastreable."
      width={680}
      footer={
        <>
          <ModalSecondaryBtn onClick={onClose}>Cancelar</ModalSecondaryBtn>
          {step > 1 && (
            <ModalSecondaryBtn onClick={back}>
              <ArrowLeft size={13} /> Atrás
            </ModalSecondaryBtn>
          )}
          {step < 3 ? (
            <ModalPrimaryBtn onClick={next}>
              Siguiente <ArrowRight size={13} />
            </ModalPrimaryBtn>
          ) : (
            <ModalPrimaryBtn onClick={handleCreate}>
              <CheckCircle2 size={13} /> Crear plan
            </ModalPrimaryBtn>
          )}
        </>
      }
    >
      {/* Stepper */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
      }}>
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <React.Fragment key={s.id}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 12px", borderRadius: 999,
                background: active ? AI.primarySoft : (done ? "rgba(34,197,94,.10)" : "var(--eco-card-muted, #F8FAFC)"),
                border: active ? `1px solid ${AI.primary}` : (done ? "1px solid rgba(34,197,94,.35)" : "1px solid var(--eco-border, #E2E8F0)"),
                color: active ? AI.primary : (done ? "#16A34A" : "var(--eco-text-soft, #64748B)"),
                fontFamily: fb, fontSize: 12, fontWeight: 700,
                whiteSpace: "nowrap",
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: active ? AI.primary : (done ? "#16A34A" : "var(--eco-card, #fff)"),
                  border: !active && !done ? "1px solid var(--eco-border, #CBD5E1)" : "none",
                  color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontFamily: fd, fontSize: 10, fontWeight: 800,
                }}>
                  {done ? <CheckCircle2 size={11} /> : s.id}
                </span>
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: "var(--eco-border, #E2E8F0)", minWidth: 12 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px", marginBottom: 12, borderRadius: 8,
          background: "rgba(239,68,68,.08)",
          border: "1px solid rgba(239,68,68,.35)",
          color: "#EF4444",
          fontFamily: fb, fontSize: 12, fontWeight: 600,
        }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Step 1: General data */}
      {step === 1 && (
        <>
          <Row>
            <Field label="Nombre del plan" required>
              <TextInput
                value={form.name}
                onChange={e => update("name", e.target.value)}
                placeholder="Ej. Plan de reducción Q2 2026"
              />
            </Field>
          </Row>
          <Row two>
            <Field label="Periodo">
              <SelectInput
                value={form.period}
                onChange={e => update("period", e.target.value)}
                options={PERIOD_OPTIONS}
              />
            </Field>
            <Field label="Meta de reducción">
              <TextInput
                value={form.targetReduction}
                onChange={e => update("targetReduction", e.target.value)}
                placeholder="Ej. -10% emisiones"
              />
            </Field>
          </Row>
          {form.period === "custom" && (
            <Row>
              <Field label="Fecha objetivo">
                <DateInput
                  value={form.customPeriod}
                  onChange={e => update("customPeriod", e.target.value)}
                />
              </Field>
            </Row>
          )}
          <Row>
            <Field label="Responsable">
              <TextInput
                value={form.responsible}
                onChange={e => update("responsible", e.target.value)}
                placeholder="Nombre o equipo responsable"
              />
            </Field>
          </Row>
        </>
      )}

      {/* Step 2: Recommendation checklist */}
      {step === 2 && (
        <>
          <div style={{
            fontFamily: fb, fontSize: 12.5, lineHeight: 1.55,
            color: "var(--eco-text-soft, #64748B)",
            marginBottom: 12,
          }}>
            Selecciona las recomendaciones inteligentes que se incluirán en el plan.
          </div>
          {recommendations.length === 0 ? (
            <div style={{
              padding: 16, borderRadius: 10,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px dashed var(--eco-border, #E2E8F0)",
              color: "var(--eco-text-soft, #64748B)",
              fontFamily: fb, fontSize: 12.5, textAlign: "center",
            }}>
              No hay recomendaciones disponibles.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recommendations.map(r => {
                const checked = !!selected[r.id];
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelected(prev => ({ ...prev, [r.id]: !checked }))}
                    type="button"
                    aria-pressed={checked}
                    style={{
                      display: "grid", gridTemplateColumns: "auto 1fr auto",
                      gap: 10, alignItems: "center",
                      padding: "10px 12px", borderRadius: 10,
                      border: checked ? `1px solid ${AI.primary}` : "1px solid var(--eco-border, #E2E8F0)",
                      background: checked ? AI.primarySoft : "var(--eco-card, #fff)",
                      cursor: "pointer", textAlign: "left",
                      transition: "all .15s",
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: checked ? AI.primary : "transparent",
                      border: checked ? `1px solid ${AI.primary}` : "1.5px solid var(--eco-border, #CBD5E1)",
                      color: "#fff", flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {checked && <CheckCircle2 size={11} />}
                    </span>
                    <span>
                      <div style={{
                        fontFamily: fb, fontSize: 13, fontWeight: 600,
                        color: "var(--eco-text-strong, #0F172A)",
                      }}>
                        {r.title}
                      </div>
                      {r.impact && (
                        <div style={{
                          fontFamily: fb, fontSize: 11.5,
                          color: "var(--eco-text-soft, #64748B)",
                          marginTop: 2,
                        }}>
                          Impacto estimado: {r.impact}
                        </div>
                      )}
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999,
                      background: r.priority === "high"
                        ? "rgba(239,68,68,.10)"
                        : r.priority === "medium"
                        ? "rgba(234,179,8,.10)"
                        : "rgba(34,197,94,.10)",
                      color: r.priority === "high"
                        ? "#EF4444"
                        : r.priority === "medium"
                        ? "#CA8A04"
                        : "#16A34A",
                      fontFamily: fb, fontSize: 10.5, fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}>
                      {r.priority === "high" ? "Alta" : r.priority === "medium" ? "Media" : "Baja"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 14,
          }}>
            <SummaryStat label="Acciones seleccionadas" value={selectedCount} />
            <SummaryStat label="Impacto estimado total" value={totalImpact > 0 ? `~${totalImpact.toFixed(1)} tCO₂e` : "—"} />
            <SummaryStat label="Prioridad general" value={overallPriority} />
            <SummaryStat label="Fecha de creación" value={new Date().toLocaleDateString("es-MX")} />
          </div>

          <div style={{
            padding: 12, borderRadius: 10,
            background: AI.primarySoft, border: `1px solid ${AI.primaryBorder}`,
            marginBottom: 12,
          }}>
            <div style={{
              fontFamily: fb, fontSize: 11, fontWeight: 700, color: AI.primary,
              textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6,
            }}>
              Plan
            </div>
            <div style={{
              fontFamily: fd, fontSize: 15, fontWeight: 800,
              color: "var(--eco-text-strong, #0F172A)",
            }}>
              {form.name || "Sin nombre"}
            </div>
            <div style={{
              fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft, #64748B)",
              marginTop: 4,
            }}>
              Periodo: {PERIOD_OPTIONS.find(p => p.value === form.period)?.label || "—"}
              {form.targetReduction && ` · Meta: ${form.targetReduction}`}
              {form.responsible && ` · Responsable: ${form.responsible}`}
            </div>
          </div>

          {selectedCount > 0 && (
            <div>
              <div style={{
                fontFamily: fb, fontSize: 11, fontWeight: 700,
                color: "var(--eco-text-soft, #64748B)",
                textTransform: "uppercase", letterSpacing: ".05em",
                marginBottom: 6,
              }}>
                Acciones incluidas
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                {recommendations.filter(r => selected[r.id]).map(r => (
                  <li key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontFamily: fb, fontSize: 12.5,
                    color: "var(--eco-text, #1E293B)",
                  }}>
                    <CheckCircle2 size={13} color={AI.primary} style={{ flexShrink: 0 }} />
                    {r.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </DiagModalShell>
  );
}

function initialForm() {
  return {
    name: "",
    period: "3m",
    customPeriod: "",
    targetReduction: "",
    responsible: "",
  };
}

function Row({ children, two }) {
  const cols = two ? 2 : 1;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
      gap: 10, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function SummaryStat({ label, value }) {
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border, #E2E8F0)",
    }}>
      <div style={{
        fontFamily: fb, fontSize: 10.5, fontWeight: 700,
        color: "var(--eco-text-soft, #64748B)",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: fd, fontSize: 16, fontWeight: 800,
        color: "var(--eco-text-strong, #0F172A)", marginTop: 3,
      }}>
        {value}
      </div>
    </div>
  );
}
