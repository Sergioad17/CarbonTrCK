import React from "react";
import {
  FlaskConical, Plus, Edit3, History, AlertTriangle, CheckCircle2, Clock, FileText, Star, BadgeCheck, Download, Upload, Power,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import FactorModal, { createEmptyFactorForm, resolveFactorDenominator } from "../../components/FactorModal";
import { exportRowsToCsv } from "../../lib/csvExport";
import {
  fetchFactorUsageCount,
  fetchFactors,
  persistFactor,
  updateFactorDefault,
  updateFactorStatus,
} from "../../api/factors";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const STATUS = {
  active:  { variant: "success", label: "Vigente" },
  expired: { variant: "error",   label: "Vencido" },
  draft:   { variant: "warning", label: "Borrador" },
};

const TYPE_LABELS = {
  electricity: "Electricidad",
  fuel:        "Combustible",
  water:       "Agua",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function metricForCategory(category) {
  if (category === "electricidad") return "electricity_consumption";
  if (category === "combustible") return "fuel_volume";
  return "custom";
}

function categoryToType(category, denominatorUnit) {
  if (category === "electricidad") return "electricity";
  if (category === "combustible") return "fuel";
  if (String(denominatorUnit || "").toLowerCase() === "m3") return "water";
  return "water";
}

function factorScopeNumber(scope) {
  return Number(String(scope || "scope2").replace("scope", "")) || 2;
}

function statusFromBackend(factor) {
  if (!factor.isActive) return "draft";
  if (factor.validTo && factor.validTo < todayIso()) return "expired";
  return "active";
}

function combinationKey(factor) {
  return [
    factor.scope,
    factor.category,
    factor.metric,
    factor.denominatorUnit,
    factor.region || "GLOBAL",
    factor.provider || "UNSPECIFIED",
  ].join("::");
}

function buildFactorCode(factor) {
  const scopeNum = factorScopeNumber(factor.scope);
  const categoryToken = (factor.category || "GEN").slice(0, 4).toUpperCase();
  const region = (factor.region || "GLOBAL").toUpperCase();
  const year = String(factor.validFrom || "").slice(0, 4) || "----";
  return `${categoryToken}-${region}-S${scopeNum}-${year}`;
}

function buildFactorName(factor) {
  const type = categoryToType(factor.category, factor.denominatorUnit);
  const region = factor.region ? ` (${factor.region})` : "";
  const provider = factor.provider ? ` · ${factor.provider}` : "";
  return `${TYPE_LABELS[type] || "Factor"}${region}${provider}`.trim();
}

function adminShape(factor, version) {
  const scopeNum = factorScopeNumber(factor.scope);
  const numeratorUnit = factor.numeratorUnit || "kgCO2e";
  const denominatorUnit = factor.denominatorUnit || "kWh";
  const type = categoryToType(factor.category, denominatorUnit);
  return {
    id: factor.id,
    code: buildFactorCode(factor),
    name: buildFactorName(factor),
    scope: scopeNum,
    type,
    unit: `${numeratorUnit}/${denominatorUnit}`,
    value: Number(factor.value) || 0,
    source: factor.provider || "",
    sourceUrl: factor.sourceUrl || "",
    validFrom: factor.validFrom || "",
    validUntil: factor.validTo || "",
    status: statusFromBackend(factor),
    version,
    official: Boolean(factor.isDefault),
    notes: factor.notes || "",
    region: factor.region || "MX",
    provider: factor.provider || "",
    numeratorUnit,
    denominatorUnit,
    isDefault: Boolean(factor.isDefault),
    isActive: Boolean(factor.isActive),
    uncertaintyPct: factor.uncertaintyPct === null || typeof factor.uncertaintyPct === "undefined" ? "" : factor.uncertaintyPct,
    rawScope: factor.scope || "scope2",
    category: factor.category || "electricidad",
    metric: factor.metric || metricForCategory(factor.category),
    raw: factor,
  };
}

function buildAdminViewModel(factors) {
  const groups = new Map();
  factors.forEach((factor) => {
    const key = combinationKey(factor);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(factor);
  });

  const versionByFactorId = new Map();
  const historyByFactorId = new Map();

  groups.forEach((group) => {
    const ordered = [...group].sort((a, b) => String(a.validFrom || "").localeCompare(String(b.validFrom || "")));
    ordered.forEach((factor, index) => {
      versionByFactorId.set(factor.id, `v${index + 1}.0`);
    });
    const orderedDesc = [...ordered].reverse();
    orderedDesc.forEach((factor) => {
      historyByFactorId.set(
        factor.id,
        orderedDesc.map((entry) => ({
          version: versionByFactorId.get(entry.id) || "v1.0",
          value: Number(entry.value) || 0,
          changedAt: entry.validFrom || (entry.createdAt ? String(entry.createdAt).slice(0, 10) : ""),
          changedBy: entry.provider ? `Fuente: ${entry.provider}` : "Admin",
          note: entry.notes || (entry.id === factor.id ? "Versión actual del factor." : "Versión histórica del factor."),
        })),
      );
    });
  });

  const list = factors.map((factor) => adminShape(factor, versionByFactorId.get(factor.id) || "v1.0"));
  const versions = {};
  factors.forEach((factor) => {
    versions[factor.id] = historyByFactorId.get(factor.id) || [];
  });

  return { list, versions };
}

function factorToModalForm(adminFactor) {
  return {
    ...createEmptyFactorForm({
      id: adminFactor.id,
      scope: adminFactor.rawScope,
      category: adminFactor.category,
      denominatorUnit: adminFactor.denominatorUnit,
      value: adminFactor.value,
      region: adminFactor.region,
      provider: adminFactor.provider,
      sourceUrl: adminFactor.sourceUrl,
      validFrom: adminFactor.validFrom,
      validTo: adminFactor.validUntil || "",
      isDefault: adminFactor.isDefault,
      isActive: adminFactor.isActive,
      uncertaintyPct: adminFactor.uncertaintyPct,
      notes: adminFactor.notes,
    }),
    editMode: "edit",
  };
}

function buildBackendPayload(form) {
  const region = form.region === "Custom" ? String(form.customRegion || "").trim() : form.region;
  const denominatorUnit = resolveFactorDenominator(form.category, form.denominatorUnit);
  return {
    scope: form.scope,
    category: form.category,
    metric: metricForCategory(form.category),
    numeratorUnit: "kgCO2e",
    denominatorUnit,
    value: Number(form.value),
    region,
    provider: String(form.provider || "").trim(),
    sourceUrl: String(form.sourceUrl || "").trim(),
    validFrom: form.validFrom,
    validTo: form.validTo || null,
    isDefault: Boolean(form.isDefault),
    isActive: Boolean(form.isActive),
    uncertaintyPct: form.uncertaintyPct === "" || form.uncertaintyPct === null || typeof form.uncertaintyPct === "undefined"
      ? null
      : Number(form.uncertaintyPct),
    notes: String(form.notes || "").trim(),
  };
}

function validateModalForm(form, { isEdit, usageCount } = {}) {
  const errors = {};
  const numericValue = Number(form.value);
  const region = form.region === "Custom" ? String(form.customRegion || "").trim() : form.region;
  if (!form.scope) errors.scope = "Selecciona un scope.";
  if (!form.category) errors.category = "Selecciona una categoría.";
  if (!Number.isFinite(numericValue) || numericValue <= 0) errors.value = "El valor debe ser mayor a 0.";
  if (!region) errors.region = "Selecciona una región.";
  if (form.region === "Custom" && !String(form.customRegion || "").trim()) errors.customRegion = "Escribe la región personalizada.";
  if (!form.validFrom) errors.validFrom = "La fecha inicial es obligatoria.";
  if (form.validTo && form.validTo < form.validFrom) errors.validTo = "La vigencia final no puede ser anterior a la inicial.";
  if (form.uncertaintyPct !== "" && form.uncertaintyPct !== null && typeof form.uncertaintyPct !== "undefined") {
    const pct = Number(form.uncertaintyPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) errors.uncertaintyPct = "La incertidumbre debe estar entre 0 y 100.";
  }
  if (isEdit && form.editMode === "edit" && Number(usageCount || 0) > 0 && !form.confirmDirectEdit) {
    errors.editMode = "Confirma que deseas editar directamente un factor ya utilizado.";
  }
  return errors;
}

function parseCsvRow(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function csvRowToBackendPayload(row) {
  const tipo = String(row.tipo || "").toLowerCase();
  const denominator = String(row.unidad || row.denominador || "").toLowerCase();
  let category = "otros";
  if (tipo.includes("electric") || denominator === "kwh") category = "electricidad";
  else if (tipo.includes("comb") || tipo.includes("fuel") || denominator === "l") category = "combustible";

  const denominatorUnit = resolveFactorDenominator(
    category,
    String(row.unidad || "").includes("/") ? String(row.unidad).split("/")[1] : row.unidad,
  );

  const scopeRaw = String(row.scope || "2").trim();
  const scopeKey = `scope${scopeRaw.replace(/[^0-9]/g, "") || "2"}`;

  const value = Number(row.valor || 0);

  return {
    scope: scopeKey,
    category,
    metric: metricForCategory(category),
    numeratorUnit: "kgCO2e",
    denominatorUnit,
    value: Number.isFinite(value) ? value : 0,
    region: String(row.region || "MX").trim() || "MX",
    provider: String(row.proveedor || row.fuente || "").trim(),
    sourceUrl: String(row["url fuente"] || row.url_fuente || "").trim(),
    validFrom: String(row["vigencia desde"] || row.vigencia_desde || todayIso()).trim(),
    validTo: String(row["vigencia hasta"] || row.vigencia_hasta || "").trim() || null,
    isDefault: String(row.default).toLowerCase() === "true",
    isActive: String(row.activo).toLowerCase() !== "false",
    uncertaintyPct: row.incertidumbre ? Number(row.incertidumbre) : null,
    notes: String(row.notas || "").trim(),
  };
}

export default function EmissionFactorsPage() {
  const [backendFactors, setBackendFactors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", scope: "all", type: "all" });
  const [selected, setSelected] = React.useState(null);
  const [modalState, setModalState] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const importInputRef = React.useRef(null);

  const { list: factors, versions } = React.useMemo(
    () => buildAdminViewModel(backendFactors),
    [backendFactors],
  );

  const loadFactors = React.useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchFactors();
      setBackendFactors(Array.isArray(next) ? next : []);
    } catch (error) {
      console.error("admin_factors_load_failed", error);
      setFeedback({
        tone: "error",
        title: "No se pudieron cargar los factores",
        message: error?.payload?.message || error?.message || "Verifica tu conexión con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  React.useEffect(() => {
    setSelected((current) => (current ? factors.find((factor) => factor.id === current.id) || null : null));
  }, [factors]);

  const filtered = React.useMemo(() => {
    return factors.filter((f) => {
      if (filters.status !== "all" && f.status !== filters.status) return false;
      if (filters.scope !== "all" && String(f.scope) !== filters.scope) return false;
      if (filters.type !== "all" && f.type !== filters.type) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!f.code.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [factors, search, filters]);

  const stats = React.useMemo(() => ({
    total:   factors.length,
    active:  factors.filter((f) => f.status === "active").length,
    expired: factors.filter((f) => f.status === "expired").length,
    draft:   factors.filter((f) => f.status === "draft").length,
  }), [factors]);

  const openCreate = () => {
    const setForm = (updater) => setModalState((prev) => {
      if (!prev) return prev;
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    setModalState({ factor: null, form: createEmptyFactorForm(), errors: {}, saving: false, usageCount: 0, setForm });
  };

  const openEdit = async (adminFactor, mode = "edit") => {
    const setForm = (updater) => setModalState((prev) => {
      if (!prev) return prev;
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    let usageCount = 0;
    try {
      usageCount = await fetchFactorUsageCount(adminFactor.id);
    } catch (error) {
      console.warn("admin_factor_usage_count_failed", error);
    }
    setModalState({
      factor: adminFactor,
      form: { ...factorToModalForm(adminFactor), editMode: mode },
      errors: {},
      saving: false,
      usageCount,
      setForm,
    });
  };

  const closeModal = () => setModalState(null);

  async function persistModal(forceDefaultOverride) {
    if (!modalState) return;
    const errors = validateModalForm(modalState.form, {
      isEdit: Boolean(modalState.factor),
      usageCount: modalState.usageCount,
    });
    if (Object.keys(errors).length > 0) {
      setModalState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setModalState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));
    const payload = buildBackendPayload(modalState.form);
    const factor = modalState.factor;
    const mode = factor ? modalState.form.editMode : "edit";

    try {
      const result = await persistFactor({
        factor: factor ? { id: factor.id } : null,
        payload,
        mode,
        forceDefaultOverride: Boolean(forceDefaultOverride),
      });
      setBackendFactors(result.factors);
      setFeedback({
        tone: "success",
        title: factor
          ? (mode === "newVersion" ? "Nueva versión creada" : "Factor actualizado")
          : "Factor creado",
        message: `${payload.scope.replace("scope", "Scope ")} / ${payload.category} / ${payload.region}`,
      });
      setModalState(null);
    } catch (error) {
      const code = error?.payload?.code;
      const conflict = error?.payload?.details?.conflict;
      if (code === "DEFAULT_FACTOR_CONFLICT" && conflict && !forceDefaultOverride) {
        const ok = typeof window !== "undefined"
          ? window.confirm(
            `Ya existe un factor predeterminado para ${conflict.scope} / ${conflict.category} / ${conflict.region}. ` +
            `Si continúas, ese factor dejará de ser predeterminado. ¿Confirmas el cambio?`,
          )
          : true;
        if (ok) {
          await persistModal(true);
          return;
        }
      }
      console.error("admin_factor_save_failed", error);
      setModalState((prev) => (prev ? { ...prev, saving: false } : prev));
      setFeedback({
        tone: "error",
        title: "No se pudo guardar el factor",
        message: error?.payload?.message || error?.message || "Inténtalo nuevamente.",
      });
    }
  }

  function handleSave(event) {
    event.preventDefault();
    persistModal(false);
  }

  async function markAsOfficial(adminFactor, force = false) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await updateFactorDefault(adminFactor.id, force);
      setBackendFactors(result.factors);
      setFeedback({
        tone: "success",
        title: "Factor oficial actualizado",
        message: `${adminFactor.code} ahora es el predeterminado del sistema.`,
      });
    } catch (error) {
      const code = error?.payload?.code;
      const conflict = error?.payload?.details?.conflict;
      if (code === "DEFAULT_FACTOR_CONFLICT" && conflict && !force) {
        const ok = typeof window !== "undefined"
          ? window.confirm(
            `Ya existe un factor predeterminado para ${conflict.scope} / ${conflict.category} / ${conflict.region}. ` +
            `¿Quieres reemplazarlo con ${adminFactor.code}?`,
          )
          : true;
        if (ok) {
          setBusy(false);
          await markAsOfficial(adminFactor, true);
          return;
        }
      } else {
        console.error("admin_factor_default_failed", error);
        setFeedback({
          tone: "error",
          title: "No se pudo marcar como oficial",
          message: error?.payload?.message || error?.message || "Inténtalo nuevamente.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(adminFactor) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await updateFactorStatus(adminFactor.id, !adminFactor.isActive);
      setBackendFactors(next);
      setFeedback({
        tone: "success",
        title: adminFactor.isActive ? "Factor desactivado" : "Factor reactivado",
        message: `${adminFactor.code} ${adminFactor.isActive ? "ya no será considerado en cálculos." : "vuelve a estar disponible."}`,
      });
    } catch (error) {
      console.error("admin_factor_status_failed", error);
      setFeedback({
        tone: "error",
        title: "No se pudo cambiar el estado",
        message: error?.payload?.message || error?.message || "Inténtalo nuevamente.",
      });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    exportRowsToCsv({
      filename: `carbontrack-admin-factores-${todayIso()}.csv`,
      rows: filtered,
      columns: [
        { label: "Codigo", get: (factor) => factor.code },
        { label: "Nombre", get: (factor) => factor.name },
        { label: "Scope", get: (factor) => factor.scope },
        { label: "Tipo", get: (factor) => factor.type },
        { label: "Valor", get: (factor) => factor.value },
        { label: "Unidad", get: (factor) => factor.unit },
        { label: "Region", get: (factor) => factor.region || "" },
        { label: "Proveedor", get: (factor) => factor.provider || "" },
        { label: "URL Fuente", get: (factor) => factor.sourceUrl || "" },
        { label: "Vigencia Desde", get: (factor) => factor.validFrom || "" },
        { label: "Vigencia Hasta", get: (factor) => factor.validUntil || "" },
        { label: "Default", get: (factor) => (factor.official ? "true" : "false") },
        { label: "Activo", get: (factor) => (factor.isActive ? "true" : "false") },
        { label: "Notas", get: (factor) => factor.notes || "" },
      ],
    });
    setFeedback({ tone: "success", title: "CSV exportado", message: `Se exportaron ${filtered.length} factor(es).` });
  }

  function triggerImport() {
    importInputRef.current?.click();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      setFeedback({ tone: "error", title: "Importación inválida", message: "El archivo no contiene filas de factores." });
      event.target.value = "";
      return;
    }
    const headers = parseCsvRow(lines[0]).map((header) => header.toLowerCase());
    const required = ["scope", "tipo", "valor"];
    if (required.some((header) => !headers.includes(header))) {
      setFeedback({ tone: "error", title: "Importación inválida", message: "El CSV debe incluir Scope, Tipo y Valor." });
      event.target.value = "";
      return;
    }

    const payloads = lines.slice(1).map((line) => {
      const cells = parseCsvRow(line);
      const row = Object.fromEntries(headers.map((header, headerIndex) => [header, cells[headerIndex] || ""]));
      return csvRowToBackendPayload(row);
    }).filter((payload) => Number(payload.value) > 0);

    if (payloads.length === 0) {
      setFeedback({ tone: "error", title: "Sin filas válidas", message: "No se pudieron convertir factores válidos desde el CSV." });
      event.target.value = "";
      return;
    }

    setBusy(true);
    let imported = 0;
    let failed = 0;
    let lastError = null;
    for (const payload of payloads) {
      try {
        await persistFactor({ factor: null, payload, mode: "edit", forceDefaultOverride: true });
        imported += 1;
      } catch (error) {
        failed += 1;
        lastError = error;
        console.error("admin_factor_import_row_failed", error);
      }
    }
    await loadFactors();
    setBusy(false);
    if (imported === 0) {
      setFeedback({
        tone: "error",
        title: "No se importaron factores",
        message: lastError?.payload?.message || lastError?.message || "Revisa el formato del CSV.",
      });
    } else {
      setFeedback({
        tone: failed > 0 ? "error" : "success",
        title: failed > 0 ? "Importación parcial" : "Importación completada",
        message: failed > 0
          ? `Se importaron ${imported} factor(es); ${failed} fila(s) fallaron.`
          : `Se importaron ${imported} factor(es) al sistema.`,
      });
    }
    event.target.value = "";
  }

  if (loading) {
    return <AdminLoadingScreen />;
  }

  const columns = [
    { key: "code", label: "Código", mono: true, width: 150, render: (v, row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {row.official && row.status === "active" && (
          <Star size={12} color="#CA8A04" fill="#CA8A04" strokeWidth={2} />
        )}
        <span style={{ opacity: row.status === "expired" ? 0.55 : 1 }}>{v}</span>
      </div>
    ) },
    { key: "name", label: "Nombre", render: (v, row) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 600, opacity: row.status === "expired" ? 0.55 : 1 }}>{v}</span>
        <span style={{ fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
          Scope {row.scope} · {TYPE_LABELS[row.type] || row.type}
          {row.status === "expired" && " · Histórico"}
        </span>
      </div>
    ) },
    { key: "value", label: "Valor", mono: true, align: "right", render: (v, row) => (
      <span><strong>{Number(v).toFixed(3)}</strong> <span style={{ opacity: .6 }}>{row.unit}</span></span>
    ) },
    { key: "version", label: "Versión", mono: true, width: 70 },
    { key: "validUntil", label: "Vigencia", mono: true, width: 110, render: (v) => v || "—" },
    { key: "status", label: "Estado", width: 110, render: (v) => (
      <AdminStatusBadge variant={STATUS[v]?.variant || "neutral"} label={STATUS[v]?.label || v} />
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={FlaskConical}
        title="Factores de emisión"
        subtitle="Gestión versionada de factores oficiales por tipo, fuente y vigencia."
        breadcrumb={["Operación", "Factores"]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={triggerImport} disabled={busy} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)", background: "var(--eco-card, #fff)", color: "var(--eco-text, #1E293B)",
              fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}>
              <Upload size={14} /> Importar
            </button>
            <button onClick={exportCsv} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)", background: "var(--eco-card, #fff)", color: "var(--eco-text, #1E293B)",
              fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Download size={14} /> Exportar
            </button>
            <button onClick={openCreate} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)", color: "#fff",
              fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}>
              <Plus size={14} /> Nuevo factor
            </button>
          </div>
        }
      />

      <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: "none" }} />

      {feedback ? (
        <div style={{
          marginBottom: 16,
          padding: "12px 14px",
          borderRadius: 12,
          border: `1px solid ${feedback.tone === "error" ? "rgba(239,68,68,.22)" : "rgba(34,197,94,.22)"}`,
          background: feedback.tone === "error" ? "rgba(239,68,68,.06)" : "rgba(34,197,94,.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ fontFamily: fd, fontSize: 14, fontWeight: 700, color: "var(--eco-text-strong, #1E293B)" }}>{feedback.title}</div>
            <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text-soft, #64748B)", marginTop: 2 }}>{feedback.message}</div>
          </div>
          <button type="button" onClick={() => setFeedback(null)} style={{ border: "none", background: "transparent", color: "var(--eco-text-soft, #64748B)", cursor: "pointer", fontFamily: fb, fontWeight: 600 }}>Cerrar</button>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <StatCard label="Total" value={stats.total} icon={FileText} color="#64748B" />
        <StatCard label="Vigentes" value={stats.active} icon={CheckCircle2} color="#16A34A" />
        <StatCard label="Vencidos" value={stats.expired} icon={AlertTriangle} color="#DC2626" />
        <StatCard label="Borradores" value={stats.draft} icon={Clock} color="#CA8A04" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por código o nombre..."
          filters={[
            { key: "status", label: "Estado", options: [
              { value: "active", label: "Vigentes" },
              { value: "expired", label: "Vencidos" },
              { value: "draft", label: "Borradores" },
            ]},
            { key: "scope", label: "Alcance", options: [
              { value: "1", label: "Scope 1" },
              { value: "2", label: "Scope 2" },
              { value: "3", label: "Scope 3" },
            ]},
            { key: "type", label: "Tipo", options: [
              { value: "electricity", label: "Electricidad" },
              { value: "fuel", label: "Combustible" },
              { value: "water", label: "Agua" },
            ]},
          ]}
          filterValues={filters}
          onFilterChange={(k, v) => setFilters((p) => ({ ...p, [k]: v }))}
          onClear={() => { setSearch(""); setFilters({ status: "all", scope: "all", type: "all" }); }}
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setSelected}
        emptyMessage="No hay factores que coincidan con los filtros."
      />

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ""}
        subtitle={selected?.code}
        badge={selected && (
          <div style={{ display: "flex", gap: 6 }}>
            <AdminStatusBadge variant={STATUS[selected.status]?.variant} label={STATUS[selected.status]?.label} />
            {selected.official && selected.status === "active" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 10px", borderRadius: 20,
                background: "rgba(234,179,8,.12)",
                border: "1px solid rgba(234,179,8,.25)",
                fontFamily: fd, fontSize: 11, fontWeight: 700,
                color: "#CA8A04",
              }}>
                <Star size={11} fill="#CA8A04" /> Oficial
              </span>
            )}
          </div>
        )}
        actions={selected && (
          <>
            {!selected.official && selected.status === "active" && (
              <button onClick={() => markAsOfficial(selected)} disabled={busy} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid rgba(234,179,8,.35)",
                background: "rgba(234,179,8,.10)", color: "#CA8A04",
                fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}>
                <BadgeCheck size={13} /> Marcar oficial
              </button>
            )}
            <button onClick={() => toggleActive(selected)} disabled={busy} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${selected.isActive ? "rgba(239,68,68,.35)" : "rgba(34,197,94,.35)"}`,
              background: selected.isActive ? "rgba(239,68,68,.08)" : "rgba(34,197,94,.08)",
              color: selected.isActive ? "#DC2626" : "#16A34A",
              fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}>
              <Power size={13} /> {selected.isActive ? "Desactivar" : "Reactivar"}
            </button>
            <button onClick={() => { openEdit(selected, "edit"); setSelected(null); }} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)", color: "#fff",
              fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}>
              <Edit3 size={13} /> Editar
            </button>
          </>
        )}
      >
        {selected && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Scope">{selected.scope}</DrawerField>
              <DrawerField label="Tipo">{TYPE_LABELS[selected.type] || selected.type}</DrawerField>
              <DrawerField label="Valor" mono>{Number(selected.value).toFixed(3)} {selected.unit}</DrawerField>
              <DrawerField label="Versión actual" mono>{selected.version}</DrawerField>
              <DrawerField label="Vigencia desde" mono>{selected.validFrom}</DrawerField>
              <DrawerField label="Vigencia hasta" mono>{selected.validUntil || "—"}</DrawerField>
            </div>
            <DrawerField label="Fuente">{selected.source || "—"}</DrawerField>
            <DrawerField label="Notas">{selected.notes || "—"}</DrawerField>

            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: ".05em", color: "var(--eco-text-soft, #64748B)",
              }}>
                <History size={13} /> Historial de versiones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(versions[selected.id] || []).map((v, i) => (
                  <div key={`${selected.id}-${v.version}-${i}`} style={{
                    display: "flex", gap: 12,
                    padding: "10px 12px",
                    background: "var(--eco-card-muted, #F8FAFC)",
                    border: "1px solid var(--eco-border, #E2E8F0)",
                    borderRadius: 8,
                  }}>
                    <div style={{
                      fontFamily: fm, fontSize: 11.5, fontWeight: 700,
                      color: "var(--eco-primary-600, #16A34A)",
                      minWidth: 38,
                    }}>{v.version}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600, color: "var(--eco-text, #1E293B)" }}>
                        {v.value} <span style={{ fontWeight: 400, color: "var(--eco-text-soft)" }}>{selected.unit}</span>
                      </div>
                      <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
                        {v.changedAt} · {v.changedBy}
                      </div>
                      {v.note && (
                        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #64748B)", marginTop: 3, fontStyle: "italic" }}>
                          {v.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <FactorModal state={modalState} onClose={closeModal} onSubmit={handleSave} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderRadius: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: "var(--eco-font-display)", fontSize: 22, fontWeight: 800, color: "var(--eco-text, #1E293B)", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft, #64748B)", marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
