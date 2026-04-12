import React from "react";
import {
  BookOpen, Plus, Edit3, Star, ToggleRight, ToggleLeft, Search,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import { catalogDefinitions, catalogEntries as mockEntries } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const EMPTY_ENTRY = {
  code: "", name: "", description: "", status: "active", isDefault: false, order: 0,
};

export default function CatalogsPage() {
  const [activeCatalog, setActiveCatalog] = React.useState(catalogDefinitions[0].id);
  const [entries, setEntries] = React.useState(mockEntries);
  const [search, setSearch] = React.useState("");
  const [modalEntry, setModalEntry] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const catDef = catalogDefinitions.find(c => c.id === activeCatalog);
  const catEntries = entries[activeCatalog] || [];

  const filtered = React.useMemo(() => {
    if (!search) return catEntries;
    const q = search.toLowerCase();
    return catEntries.filter(e =>
      e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    );
  }, [catEntries, search]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setEntries(prev => {
        const list = [...(prev[activeCatalog] || [])];
        if (modalEntry.id) {
          const idx = list.findIndex(e => e.id === modalEntry.id);
          if (idx >= 0) list[idx] = { ...modalEntry };
        } else {
          list.push({ ...modalEntry, id: "new" + Date.now(), order: list.length + 1 });
        }
        return { ...prev, [activeCatalog]: list };
      });
      setSaving(false);
      setModalEntry(null);
    }, 400);
  }

  function toggleStatus(entry) {
    setEntries(prev => ({
      ...prev,
      [activeCatalog]: prev[activeCatalog].map(e =>
        e.id === entry.id ? { ...e, status: e.status === "active" ? "inactive" : "active" } : e
      ),
    }));
  }

  function toggleDefault(entry) {
    setEntries(prev => ({
      ...prev,
      [activeCatalog]: prev[activeCatalog].map(e =>
        e.id === entry.id ? { ...e, isDefault: !e.isDefault } : e
      ),
    }));
  }

  const columns = [
    {
      key: "order", label: "#", width: "5%", align: "center",
      render: (v) => <span style={{ fontFamily: fm, fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>{v}</span>,
    },
    { key: "code", label: "Código", width: "10%", mono: true },
    {
      key: "name", label: "Nombre", width: "20%",
      render: (v, row) => (
        <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          {v}
          {row.isDefault && (
            <Star size={11} fill="var(--eco-warning, #CA8A04)" color="var(--eco-warning, #CA8A04)" />
          )}
        </span>
      ),
    },
    { key: "description", label: "Descripción", width: "35%" },
    {
      key: "status", label: "Estado", width: "10%",
      render: (v) => <AdminStatusBadge status={v === "active" ? "success" : "inactive"} label={v === "active" ? "Activo" : "Inactivo"} />,
    },
    {
      key: "actions", label: "", width: "14%", align: "right",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <button
            onClick={e => { e.stopPropagation(); toggleDefault(row); }}
            title={row.isDefault ? "Quitar valor por defecto" : "Marcar como valor por defecto"}
            style={{
              padding: "4px 7px", borderRadius: 6,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "transparent", cursor: "pointer",
              color: row.isDefault ? "var(--eco-warning, #CA8A04)" : "var(--eco-text-soft, #94A3B8)",
              display: "flex", alignItems: "center",
            }}
          >
            <Star size={12} fill={row.isDefault ? "currentColor" : "none"} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); toggleStatus(row); }}
            title={row.status === "active" ? "Desactivar" : "Activar"}
            style={{
              padding: "4px 7px", borderRadius: 6,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "transparent", cursor: "pointer",
              color: row.status === "active" ? "var(--eco-success, #16A34A)" : "var(--eco-text-soft, #94A3B8)",
              display: "flex", alignItems: "center",
            }}
          >
            {row.status === "active" ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); setModalEntry({ ...row }); }}
            style={{
              padding: "4px 7px", borderRadius: 6,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "transparent", cursor: "pointer",
              color: "var(--eco-text-soft, #64748B)",
              display: "flex", alignItems: "center",
            }}
          >
            <Edit3 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Catálogos generales"
        subtitle={`${catalogDefinitions.length} catálogos registrados`}
        icon={BookOpen}
        breadcrumb={["Operación", "Catálogos"]}
      />

      {/* Layout: sidebar + content */}
      <div style={{ display: "flex", gap: 16, minHeight: 450 }}>
        {/* Catalog sidebar */}
        <div style={{
          width: 240, flexShrink: 0,
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 12, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 14px", fontFamily: fd, fontSize: 11, fontWeight: 700,
            color: "var(--eco-text-soft, #94A3B8)",
            textTransform: "uppercase", letterSpacing: ".06em",
            borderBottom: "1px solid var(--eco-border, #E2E8F0)",
          }}>Catálogos</div>
          <div style={{ overflowY: "auto", maxHeight: 480 }}>
            {catalogDefinitions.map(cat => {
              const active = activeCatalog === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCatalog(cat.id); setSearch(""); }}
                  style={{
                    width: "100%", border: "none", textAlign: "left",
                    padding: "10px 14px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontFamily: fb, fontSize: 12.5,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--eco-primary-600, #16A34A)" : "var(--eco-text, #1E293B)",
                    background: active ? "rgba(34,197,94,.07)" : "transparent",
                    borderLeft: active ? "3px solid var(--eco-primary-500, #22C55E)" : "3px solid transparent",
                    cursor: "pointer", transition: "all .12s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? "rgba(34,197,94,.07)" : "transparent"; }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cat.label}
                  </span>
                  <span style={{
                    fontFamily: fm, fontSize: 10, fontWeight: 600,
                    color: "var(--eco-text-soft, #94A3B8)",
                    padding: "1px 6px", borderRadius: 6,
                    background: "var(--eco-card-muted, #F1F5F9)",
                  }}>{(entries[cat.id] || []).length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Catalog header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 14, flexWrap: "wrap", gap: 10,
          }}>
            <div>
              <h3 style={{
                fontFamily: fd, fontSize: 15, fontWeight: 700,
                color: "var(--eco-text, #1E293B)", margin: 0,
              }}>{catDef?.label}</h3>
              <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #64748B)" }}>
                {filtered.length} valor{filtered.length !== 1 ? "es" : ""}
                {filtered.length !== catEntries.length && ` de ${catEntries.length}`}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Inline search */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: 7,
                border: "1px solid var(--eco-border, #E2E8F0)",
                background: "var(--eco-surface, #fff)",
              }}>
                <Search size={13} color="var(--eco-text-soft, #94A3B8)" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  style={{
                    border: "none", outline: "none", background: "transparent",
                    fontFamily: fb, fontSize: 12, color: "var(--eco-text, #1E293B)",
                    width: 120,
                  }}
                />
              </div>
              <button
                onClick={() => setModalEntry({ ...EMPTY_ENTRY })}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 14px", borderRadius: 8, border: "none",
                  background: "var(--eco-primary-500, #22C55E)",
                  fontFamily: fb, fontSize: 12.5, fontWeight: 600,
                  color: "#fff", cursor: "pointer", transition: "all .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)"}
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
          </div>

          <AdminDataTable
            columns={columns}
            data={filtered}
            sortable
            maxHeight={420}
            compact
            emptyMessage={search ? "Sin resultados para esta búsqueda." : "Este catálogo aún no tiene valores."}
          />
        </div>
      </div>

      {/* ── Entry Modal ────────────────────────────────────────────── */}
      <AdminFormModal
        open={!!modalEntry}
        onClose={() => setModalEntry(null)}
        title={modalEntry?.id ? "Editar valor" : "Nuevo valor"}
        subtitle={catDef?.label}
        onSave={handleSave}
        saving={saving}
        width={480}
      >
        {modalEntry && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminTextField
                label="Código" required
                value={modalEntry.code}
                onChange={v => setModalEntry(p => ({ ...p, code: v }))}
                placeholder="ELEC"
              />
              <AdminTextField
                label="Nombre" required
                value={modalEntry.name}
                onChange={v => setModalEntry(p => ({ ...p, name: v }))}
                placeholder="Electricidad"
              />
            </div>
            <AdminTextField
              label="Descripción" multiline rows={2}
              value={modalEntry.description}
              onChange={v => setModalEntry(p => ({ ...p, description: v }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminSelectField
                label="Estado"
                value={modalEntry.status}
                onChange={v => setModalEntry(p => ({ ...p, status: v }))}
                options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
              />
              <AdminToggleField
                label="Valor por defecto"
                checked={modalEntry.isDefault}
                onChange={v => setModalEntry(p => ({ ...p, isDefault: v }))}
                description="Se usará como valor predeterminado"
              />
            </div>
          </>
        )}
      </AdminFormModal>
    </>
  );
}
