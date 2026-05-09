import React from "react";
import {
  BookOpen, Plus, Edit3, ToggleRight, ToggleLeft, Search, RefreshCw, AlertCircle, Lock,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import { AdminNumberField, AdminSelectField, AdminTextField } from "../components/AdminFormSection";
import {
  createAdminCatalogEntry,
  fetchAdminCatalogs,
  updateAdminCatalogEntry,
  updateAdminCatalogEntryStatus,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const EMPTY_ENTRY = {
  code: "",
  name: "",
  description: "",
  status: "active",
  isDefault: false,
  order: 0,
};

function normalizeEntryForCatalog(catalog, options) {
  const entry = { ...EMPTY_ENTRY, status: "active" };
  for (const field of catalog?.fields || []) {
    if (field.type === "number") {
      entry[field.key] = field.min || 1;
      continue;
    }
    const sourceOptions = options?.[field.source] || [];
    entry[field.key] = field.type === "select" ? (sourceOptions[0]?.value || "") : "";
  }
  return entry;
}

function mergeEntry(list, entry) {
  const current = Array.isArray(list) ? list : [];
  if (!entry?.id) return current;
  const index = current.findIndex((item) => item.id === entry.id);
  if (index < 0) return [...current, { ...entry, order: current.length + 1 }];
  const next = [...current];
  next[index] = { ...entry, order: next[index].order || index + 1 };
  return next;
}

function FieldError({ children }) {
  if (!children) return null;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 12px",
      borderRadius: 8,
      border: "1px solid rgba(220,38,38,.22)",
      background: "rgba(220,38,38,.06)",
      color: "var(--eco-danger, #DC2626)",
      fontFamily: fb,
      fontSize: 12,
    }}>
      <AlertCircle size={14} />
      <span>{children}</span>
    </div>
  );
}

export default function CatalogsPage() {
  const [catalogDefinitions, setCatalogDefinitions] = React.useState([]);
  const [entries, setEntries] = React.useState({});
  const [options, setOptions] = React.useState({});
  const [activeCatalog, setActiveCatalog] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [modalEntry, setModalEntry] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const catDef = catalogDefinitions.find((catalog) => catalog.id === activeCatalog);
  const catEntries = entries[activeCatalog] || [];
  const canEditCatalog = catDef?.canEdit !== false;
  const hasRowActions = Boolean(canEditCatalog || catDef?.supportsStatus);
  const editableCatalogs = React.useMemo(
    () => catalogDefinitions.filter((catalog) => !catalog.controlled && catalog.canEdit !== false),
    [catalogDefinitions],
  );
  const readOnlyCatalogs = React.useMemo(
    () => catalogDefinitions.filter((catalog) => catalog.controlled || catalog.canEdit === false),
    [catalogDefinitions],
  );

  const loadCatalogs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchAdminCatalogs();
      const definitions = payload.definitions || [];
      setCatalogDefinitions(definitions);
      setEntries(payload.entries || {});
      setOptions(payload.options || {});
      setActiveCatalog((current) => current || definitions[0]?.id || "");
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los catálogos.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  const filtered = React.useMemo(() => {
    if (!search) return catEntries;
    const q = search.toLowerCase();
    return catEntries.filter((entry) =>
      String(entry.name || "").toLowerCase().includes(q) ||
      String(entry.code || "").toLowerCase().includes(q) ||
      String(entry.description || "").toLowerCase().includes(q)
    );
  }, [catEntries, search]);

  async function handleSave() {
    if (!modalEntry || !catDef) return;
    setSaving(true);
    setError("");
    try {
      const savedEntry = modalEntry.id
        ? await updateAdminCatalogEntry(activeCatalog, modalEntry.id, modalEntry)
        : await createAdminCatalogEntry(activeCatalog, modalEntry);
      setEntries((prev) => ({
        ...prev,
        [activeCatalog]: mergeEntry(prev[activeCatalog], savedEntry),
      }));
      setModalEntry(null);
      await loadCatalogs();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el valor del catálogo.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(entry) {
    if (!catDef?.supportsStatus) return;
    const nextStatus = entry.status === "active" ? "inactive" : "active";
    setError("");
    setEntries((prev) => ({
      ...prev,
      [activeCatalog]: (prev[activeCatalog] || []).map((item) =>
        item.id === entry.id ? { ...item, status: nextStatus } : item
      ),
    }));
    try {
      const updated = await updateAdminCatalogEntryStatus(activeCatalog, entry.id, nextStatus);
      setEntries((prev) => ({
        ...prev,
        [activeCatalog]: mergeEntry(prev[activeCatalog], updated),
      }));
    } catch (err) {
      setError(err?.message || "No se pudo cambiar el estado.");
      await loadCatalogs();
    }
  }

  function openNewEntry() {
    if (!catDef?.canCreate) return;
    setModalEntry(normalizeEntryForCatalog(catDef, options));
  }

  function renderExtraField(field) {
    if (!modalEntry) return null;
    const commonProps = {
      key: field.key,
      label: field.label,
      required: field.required,
      value: modalEntry[field.key],
      onChange: (value) => setModalEntry((current) => ({ ...current, [field.key]: value })),
    };
    if (field.type === "select") {
      return (
        <AdminSelectField
          {...commonProps}
          options={options[field.source] || []}
        />
      );
    }
    if (field.type === "number") {
      return (
        <AdminNumberField
          {...commonProps}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    }
    return <AdminTextField {...commonProps} />;
  }

  const columns = [
    {
      key: "order", label: "#", width: "5%", align: "center",
      render: (value) => <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>{value}</span>,
    },
    ...(catDef?.usesCode === false ? [] : [{ key: "code", label: "Código", width: "14%", mono: true }]),
    {
      key: "name", label: "Nombre", width: "22%",
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    { key: "description", label: "Descripción", width: "35%" },
    {
      key: "status", label: "Estado", width: "10%",
      render: (value) => <AdminStatusBadge status={value === "active" ? "success" : "inactive"} label={value === "active" ? "Activo" : "Inactivo"} />,
    },
    ...(hasRowActions ? [{
      key: "actions", label: "", width: "14%", align: "right",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          {canEditCatalog && catDef?.supportsStatus && (
            <button
              onClick={(event) => { event.stopPropagation(); toggleStatus(row); }}
              title={row.status === "active" ? "Desactivar" : "Activar"}
              style={{
                padding: "4px 7px",
                borderRadius: 6,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "transparent",
                cursor: "pointer",
                color: row.status === "active" ? "var(--eco-success, #16A34A)" : "var(--eco-text-soft, #94A3B8)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {row.status === "active" ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            </button>
          )}
          {canEditCatalog && (
            <button
              onClick={(event) => { event.stopPropagation(); setModalEntry({ ...row }); }}
              title="Editar"
              style={{
                padding: "4px 7px",
                borderRadius: 6,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "transparent",
                cursor: "pointer",
                color: "var(--eco-text-soft, #64748B)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Edit3 size={12} />
            </button>
          )}
        </div>
      ),
    }] : []),
  ];

  function renderCatalogButton(catalog) {
    const active = activeCatalog === catalog.id;
    return (
      <button
        key={catalog.id}
        onClick={() => { setActiveCatalog(catalog.id); setSearch(""); }}
        style={{
          width: "100%",
          border: "none",
          textAlign: "left",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: fb,
          fontSize: 12.5,
          fontWeight: active ? 600 : 400,
          color: active ? "var(--eco-primary-600, #16A34A)" : "var(--eco-text, #1E293B)",
          background: active ? "rgba(34,197,94,.07)" : "transparent",
          borderLeft: active ? "3px solid var(--eco-primary-500, #22C55E)" : "3px solid transparent",
          cursor: "pointer",
          transition: "all .12s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {catalog.label}
        </span>
        <span style={{
          fontFamily: fm,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--eco-text-soft, #94A3B8)",
          padding: "1px 6px",
          borderRadius: 6,
          background: "var(--eco-card-muted, #F1F5F9)",
        }}>{(entries[catalog.id] || []).length}</span>
      </button>
    );
  }

  function CatalogGroup({ title, count, children }) {
    if (!count) return null;
    return (
      <div>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px 7px",
          borderTop: "1px solid var(--eco-border, #E2E8F0)",
          background: "var(--eco-card-muted, #F8FAFC)",
        }}>
          <span style={{
            fontFamily: fd,
            fontSize: 10.5,
            fontWeight: 800,
            color: "var(--eco-text-soft, #64748B)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}>{title}</span>
          <span style={{
            fontFamily: fm,
            fontSize: 10,
            fontWeight: 700,
            color: "var(--eco-text-soft, #94A3B8)",
          }}>{count}</span>
        </div>
        {children}
      </div>
    );
  }

  if (loading) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <AdminPageHeader
        title="Catálogos generales"
        subtitle={`${catalogDefinitions.length} catálogos conectados al sistema`}
        icon={BookOpen}
        breadcrumb={["Operación", "Catálogos"]}
      />

      <FieldError>{error}</FieldError>

      <div style={{ display: "flex", gap: 16, minHeight: 450, marginTop: error ? 14 : 0 }}>
        <div style={{
          width: 250,
          flexShrink: 0,
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 14px",
            fontFamily: fd,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--eco-text-soft, #94A3B8)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          }}>Catálogos</div>
          <div style={{ overflowY: "auto", maxHeight: 480 }}>
            <CatalogGroup title="Editables" count={editableCatalogs.length}>
              {editableCatalogs.map(renderCatalogButton)}
            </CatalogGroup>
            <CatalogGroup title="Solo lectura" count={readOnlyCatalogs.length}>
              {readOnlyCatalogs.map(renderCatalogButton)}
            </CatalogGroup>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}>
            <div>
              <h3 style={{
                fontFamily: fd,
                fontSize: 15,
                fontWeight: 700,
                color: "var(--eco-text, #1E293B)",
                margin: 0,
              }}>{catDef?.label || "Catálogo"}</h3>
              <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #64748B)" }}>
                {loading ? "Cargando valores..." : `${filtered.length} valor${filtered.length !== 1 ? "es" : ""}${filtered.length !== catEntries.length ? ` de ${catEntries.length}` : ""}`}
                {catDef?.controlled ? " · Lectura controlada" : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={loadCatalogs}
                title="Actualizar"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  background: "var(--eco-surface, #fff)",
                  color: "var(--eco-text-soft, #64748B)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={13} />
              </button>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: 7,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "var(--eco-surface, #fff)",
              }}>
                <Search size={13} color="var(--eco-text-soft, #94A3B8)" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontFamily: fb,
                    fontSize: 12,
                    color: "var(--eco-text, #1E293B)",
                    width: 120,
                  }}
                />
              </div>
              {catDef?.controlled && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  background: "var(--eco-card-muted, #F8FAFC)",
                  fontFamily: fb,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--eco-text-soft, #64748B)",
                }}>
                  <Lock size={13} /> Controlado
                </span>
              )}
              {catDef?.canCreate && canEditCatalog && (
                <button
                  onClick={openNewEntry}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--eco-primary-500, #22C55E)",
                    fontFamily: fb,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#fff",
                    cursor: "pointer",
                    transition: "all .12s",
                  }}
                >
                  <Plus size={13} /> Agregar
                </button>
              )}
            </div>
          </div>

          <AdminDataTable
            columns={columns}
            data={loading ? [] : filtered}
            sortable
            maxHeight={420}
            compact
            emptyMessage={loading ? "Cargando catálogo..." : search ? "Sin resultados para esta búsqueda." : "Este catálogo aún no tiene valores."}
          />
        </div>
      </div>

      <AdminFormModal
        open={!!modalEntry}
        onClose={() => setModalEntry(null)}
        title={modalEntry?.id ? "Editar valor" : "Nuevo valor"}
        subtitle={catDef?.label}
        onSave={handleSave}
        saving={saving}
        width={560}
      >
        {modalEntry && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {catDef?.usesCode !== false && (
                <AdminTextField
                  label="Código"
                  required
                  value={modalEntry.code}
                  onChange={(value) => setModalEntry((current) => ({ ...current, code: value }))}
                  disabled={modalEntry.id && !catDef?.canEditCode}
                  placeholder="codigo"
                />
              )}
              <AdminTextField
                label="Nombre"
                required
                value={modalEntry.name}
                onChange={(value) => setModalEntry((current) => ({ ...current, name: value }))}
                placeholder="Nombre visible"
              />
            </div>
            <AdminTextField
              label="Descripción"
              multiline
              rows={2}
              value={modalEntry.description}
              onChange={(value) => setModalEntry((current) => ({ ...current, description: value }))}
            />
            {(catDef?.fields || []).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {catDef.fields.map(renderExtraField)}
              </div>
            )}
            {catDef?.supportsStatus && (
              <AdminSelectField
                label="Estado"
                value={modalEntry.status}
                onChange={(value) => setModalEntry((current) => ({ ...current, status: value }))}
                options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
              />
            )}
          </>
        )}
      </AdminFormModal>
    </>
  );
}
