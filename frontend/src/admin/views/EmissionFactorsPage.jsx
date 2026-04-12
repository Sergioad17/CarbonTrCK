import React from "react";
import {
  FlaskConical, Plus, Edit3, History, AlertTriangle, CheckCircle2, Clock, FileText, Star, BadgeCheck, Copy, Download, Upload,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { emissionFactors as mockFactors, factorVersions as mockVersions } from "../mocks/adminMocks";
import FactorModal, { createEmptyFactorForm, resolveFactorDenominator } from "../../components/FactorModal";
import { exportRowsToCsv } from "../../lib/csvExport";

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

const EMPTY_FACTOR = {
  code: "", name: "", scope: 2, type: "electricity", unit: "kgCO2e/kWh",
  value: 0, source: "", validFrom: "", validUntil: "", status: "draft",
  version: "v1.0", official: false, notes: "",
};

function splitUnit(unit = "") {
  const [numeratorUnit = "kgCO2e", denominatorUnit = "kWh"] = String(unit).split("/");
  return { numeratorUnit, denominatorUnit };
}

function typeToCategory(type, denominatorUnit = "") {
  if (type === "electricity") return "electricidad";
  if (type === "fuel") return "combustible";
  if (type === "water" && denominatorUnit.toLowerCase() === "m3") return "otros";
  return "otros";
}

function categoryToType(category, denominatorUnit, fallbackType = "water") {
  if (category === "electricidad") return "electricity";
  if (category === "combustible") return "fuel";
  if (String(denominatorUnit || "").toLowerCase() === "m3") return "water";
  return fallbackType;
}

function normalizeFactor(factor) {
  const { numeratorUnit, denominatorUnit } = splitUnit(factor.unit);
  return {
    ...factor,
    region: factor.region || "MX",
    provider: factor.provider || factor.source || "",
    sourceUrl: factor.sourceUrl || "",
    numeratorUnit,
    denominatorUnit,
    isDefault: typeof factor.isDefault === "boolean" ? factor.isDefault : Boolean(factor.official),
    isActive: typeof factor.isActive === "boolean" ? factor.isActive : factor.status === "active",
    uncertaintyPct: factor.uncertaintyPct ?? "",
  };
}

function factorToModalForm(factor) {
  const normalized = normalizeFactor(factor);
  return {
    ...createEmptyFactorForm({
      id: normalized.id,
      scope: `scope${normalized.scope}`,
      category: typeToCategory(normalized.type, normalized.denominatorUnit),
      denominatorUnit: normalized.denominatorUnit,
      value: normalized.value,
      region: normalized.region,
      provider: normalized.provider,
      sourceUrl: normalized.sourceUrl,
      validFrom: normalized.validFrom,
      validTo: normalized.validUntil || "",
      isDefault: normalized.isDefault,
      isActive: normalized.isActive,
      uncertaintyPct: normalized.uncertaintyPct,
      notes: normalized.notes,
    }),
    editMode: "edit",
  };
}

function buildFactorFromModal(form, currentFactor, nextId) {
  const denominatorUnit = resolveFactorDenominator(form.category, form.denominatorUnit);
  const scope = Number(String(form.scope || "scope2").replace("scope", "")) || 2;
  const type = categoryToType(form.category, denominatorUnit, currentFactor?.type || "water");
  const region = form.region === "Custom" ? String(form.customRegion || "").trim() : form.region;
  const status = form.isActive ? "active" : "draft";
  const currentVersion = Number(String(currentFactor?.version || "v1.0").replace(/[^\d.]/g, "")) || 1;
  const version = currentFactor
    ? (form.editMode === "newVersion" ? `v${(currentVersion + 0.1).toFixed(1)}` : currentFactor.version || "v1.0")
    : "v1.0";
  const generatedCode = currentFactor?.code || `${type.toUpperCase().slice(0, 4)}-S${scope}-${String(nextId).replace(/^f/i, "").toUpperCase()}`;
  const generatedName = currentFactor?.name || `Factor ${TYPE_LABELS[type] || "Personalizado"} Scope ${scope}${region ? ` (${region})` : ""}`;

  return normalizeFactor({
    ...(currentFactor || {}),
    id: currentFactor?.id || nextId,
    code: generatedCode,
    name: generatedName,
    scope,
    type,
    unit: `${form.numeratorUnit || "kgCO2e"}/${denominatorUnit}`,
    value: Number(form.value),
    source: String(form.provider || "").trim() || currentFactor?.source || "Fuente interna",
    validFrom: form.validFrom,
    validUntil: form.validTo || "",
    status,
    version,
    official: Boolean(form.isDefault),
    notes: String(form.notes || "").trim(),
    region,
    provider: String(form.provider || "").trim(),
    sourceUrl: String(form.sourceUrl || "").trim(),
    numeratorUnit: form.numeratorUnit || "kgCO2e",
    denominatorUnit,
    isDefault: Boolean(form.isDefault),
    isActive: Boolean(form.isActive),
    uncertaintyPct: form.uncertaintyPct === "" ? "" : Number(form.uncertaintyPct),
  });
}

function validateModalForm(form) {
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

function detectDuplicateCode(factors, factor) {
  return factors.find(f => f.id !== factor.id && f.code.trim().toLowerCase() === (factor.code || "").trim().toLowerCase());
}
function detectOverlap(factors, factor) {
  if (!factor.validFrom || !factor.validUntil) return null;
  return factors.find(f =>
    f.id !== factor.id &&
    f.scope === factor.scope &&
    f.type === factor.type &&
    f.status === "active" &&
    f.validFrom && f.validUntil &&
    !(factor.validUntil < f.validFrom || factor.validFrom > f.validUntil)
  );
}

export default function EmissionFactorsPage() {
  const [factors, setFactors] = React.useState(() => mockFactors.map(normalizeFactor));
  const [versions, setVersions] = React.useState(mockVersions);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ status: "all", scope: "all", type: "all" });
  const [selected, setSelected] = React.useState(null);
  const [modalState, setModalState] = React.useState(null);
  const [feedback, setFeedback] = React.useState(null);
  const importInputRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    return factors.filter(f => {
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
    active:  factors.filter(f => f.status === "active").length,
    expired: factors.filter(f => f.status === "expired").length,
    draft:   factors.filter(f => f.status === "draft").length,
  }), [factors]);

  const openCreate = () => {
    const setForm = (updater) => setModalState((prev) => {
      if (!prev) return prev;
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    setModalState({ factor: null, form: createEmptyFactorForm(), errors: {}, saving: false, usageCount: 0, setForm });
  };

  const openEdit = (factor, mode = "edit") => {
    const setForm = (updater) => setModalState((prev) => {
      if (!prev) return prev;
      const nextForm = typeof updater === "function" ? updater(prev.form) : updater;
      return { ...prev, form: nextForm };
    });
    setModalState({
      factor,
      form: { ...factorToModalForm(factor), editMode: mode },
      errors: {},
      saving: false,
      usageCount: versions[factor.id]?.length || 0,
      setForm,
    });
  };

  const closeModal = () => setModalState(null);

  function handleSave(event) {
    event.preventDefault();
    if (!modalState) return;
    const errors = validateModalForm(modalState.form, factors, modalState.factor);
    if (Object.keys(errors).length > 0) {
      setModalState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setModalState((prev) => (prev ? { ...prev, saving: true, errors: {} } : prev));

    window.setTimeout(() => {
      setFactors((prev) => {
        const nextId = modalState.factor?.id || `f${prev.length + 1}`;
        const nextFactor = buildFactorFromModal(modalState.form, modalState.factor, nextId);
        let next = modalState.factor
          ? prev.map((item) => (item.id === modalState.factor.id ? nextFactor : item))
          : [...prev, nextFactor];
        if (nextFactor.official) {
          next = next.map((item) => (
            item.id !== nextFactor.id && item.scope === nextFactor.scope && item.type === nextFactor.type
              ? { ...item, official: false, isDefault: false }
              : item
          ));
        }
        setSelected((current) => (current?.id === nextFactor.id ? nextFactor : current));
        setVersions((current) => {
          const existing = current[nextFactor.id] || [];
          const entry = {
            version: nextFactor.version,
            value: nextFactor.value,
            changedAt: new Date().toISOString().slice(0, 10),
            changedBy: "Admin CarbonTrack Demo",
            note: modalState.form.notes || (modalState.factor ? "Actualización desde admin avanzado." : "Alta inicial del factor."),
          };
          return {
            ...current,
            [nextFactor.id]: modalState.factor && modalState.form.editMode !== "newVersion"
              ? existing.map((item, index) => (index === 0 ? entry : item))
              : [entry, ...existing],
          };
        });
        setFeedback({
          tone: "success",
          title: modalState.factor
            ? (modalState.form.editMode === "newVersion" ? "Nueva versión creada" : "Factor actualizado")
            : "Factor creado",
          message: `${nextFactor.code} quedó disponible en el catálogo administrativo.`,
        });
        return next;
      });
      setModalState(null);
    }, 180);
  }

  function markAsOfficial(factor) {
    setFactors(prev => prev.map(f => {
      if (f.id === factor.id) return { ...f, official: true, isDefault: true };
      if (f.scope === factor.scope && f.type === factor.type) return { ...f, official: false, isDefault: false };
      return f;
    }));
    setSelected(s => s && s.id === factor.id ? { ...s, official: true, isDefault: true } : s);
    setFeedback({ tone: "success", title: "Factor oficial actualizado", message: `${factor.code} ahora es el predeterminado visible.` });
  }

  function exportCsv() {
    exportRowsToCsv({
      filename: `carbontrack-admin-factores-${new Date().toISOString().slice(0, 10)}.csv`,
      rows: filtered,
      columns: [
        { label: "Codigo", get: (factor) => factor.code },
        { label: "Nombre", get: (factor) => factor.name },
        { label: "Scope", get: (factor) => factor.scope },
        { label: "Tipo", get: (factor) => factor.type },
        { label: "Valor", get: (factor) => factor.value },
        { label: "Unidad", get: (factor) => factor.unit },
        { label: "Region", get: (factor) => factor.region || "" },
        { label: "Proveedor", get: (factor) => factor.provider || factor.source || "" },
        { label: "URL Fuente", get: (factor) => factor.sourceUrl || "" },
        { label: "Vigencia Desde", get: (factor) => factor.validFrom || "" },
        { label: "Vigencia Hasta", get: (factor) => factor.validUntil || "" },
        { label: "Default", get: (factor) => (factor.official ? "true" : "false") },
        { label: "Activo", get: (factor) => (factor.status === "active" ? "true" : "false") },
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
    const required = ["codigo", "nombre", "scope", "tipo", "valor"];
    if (required.some((header) => !headers.includes(header))) {
      setFeedback({ tone: "error", title: "Importación inválida", message: "El CSV debe incluir Código, Nombre, Scope, Tipo y Valor." });
      event.target.value = "";
      return;
    }
    const imported = lines.slice(1).map((line, index) => {
      const cells = parseCsvRow(line);
      const row = Object.fromEntries(headers.map((header, headerIndex) => [header, cells[headerIndex] || ""]));
      return normalizeFactor({
        id: `imp-${Date.now()}-${index}`,
        code: row.codigo || `IMP-${index + 1}`,
        name: row.nombre || `Factor importado ${index + 1}`,
        scope: Number(row.scope) || 2,
        type: row.tipo || "electricity",
        unit: row.unidad || "kgCO2e/kWh",
        value: Number(row.valor || 0),
        source: row.proveedor || "",
        validFrom: row["vigencia desde"] || row.vigencia_desde || new Date().toISOString().slice(0, 10),
        validUntil: row["vigencia hasta"] || row.vigencia_hasta || "",
        status: String(row.activo).toLowerCase() === "false" ? "draft" : "active",
        version: row.version || "v1.0",
        official: String(row.default).toLowerCase() === "true",
        notes: row.notas || "",
        region: row.region || "MX",
        provider: row.proveedor || "",
        sourceUrl: row["url fuente"] || row.url_fuente || "",
      });
    }).filter((factor) => factor.value > 0);

    if (imported.length === 0) {
      setFeedback({ tone: "error", title: "Sin filas válidas", message: "No se pudieron convertir factores válidos desde el CSV." });
      event.target.value = "";
      return;
    }

    setFactors((prev) => {
      const byCode = new Map(prev.map((factor) => [factor.code.toLowerCase(), factor]));
      imported.forEach((factor) => {
        byCode.set(factor.code.toLowerCase(), factor);
      });
      return Array.from(byCode.values());
    });
    setFeedback({ tone: "success", title: "Importación completada", message: `Se importaron ${imported.length} factor(es) en frontend.` });
    event.target.value = "";
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
          Scope {row.scope} · {TYPE_LABELS[row.type]}
          {row.status === "expired" && " · Histórico"}
        </span>
      </div>
    ) },
    { key: "value", label: "Valor", mono: true, align: "right", render: (v, row) => (
      <span><strong>{v.toFixed(3)}</strong> <span style={{ opacity: .6 }}>{row.unit}</span></span>
    ) },
    { key: "version", label: "Versión", mono: true, width: 70 },
    { key: "validUntil", label: "Vigencia", mono: true, width: 110, render: v => v || "—" },
    { key: "status", label: "Estado", width: 110, render: v => (
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
            <button onClick={triggerImport} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)", background: "var(--eco-card, #fff)", color: "var(--eco-text, #1E293B)",
              fontFamily: fb, fontSize: 13, fontWeight: 600, cursor: "pointer",
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

      {/* Stats */}
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
          onFilterChange={(k, v) => setFilters(p => ({ ...p, [k]: v }))}
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

      {/* Detail drawer */}
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
              <button onClick={() => markAsOfficial(selected)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid rgba(234,179,8,.35)",
                background: "rgba(234,179,8,.10)", color: "#CA8A04",
                fontFamily: fb, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}>
                <BadgeCheck size={13} /> Marcar oficial
              </button>
            )}
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
              <DrawerField label="Tipo">{TYPE_LABELS[selected.type]}</DrawerField>
              <DrawerField label="Valor" mono>{selected.value.toFixed(3)} {selected.unit}</DrawerField>
              <DrawerField label="Versión actual" mono>{selected.version}</DrawerField>
              <DrawerField label="Vigencia desde" mono>{selected.validFrom}</DrawerField>
              <DrawerField label="Vigencia hasta" mono>{selected.validUntil}</DrawerField>
            </div>
            <DrawerField label="Fuente">{selected.source}</DrawerField>
            <DrawerField label="Notas">{selected.notes}</DrawerField>

            {/* Version history */}
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
                  <div key={i} style={{
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
