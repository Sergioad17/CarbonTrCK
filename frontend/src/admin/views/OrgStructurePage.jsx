import React from "react";
import {
  Network, Plus, ChevronDown, ChevronRight, Edit3, Zap, Flame,
  Cpu, Target, Building2, MapPin, FlaskConical, Wrench,
  Briefcase, DoorOpen, GraduationCap,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import { orgEntities as mockEntities, orgEntityTypes, campuses } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";

const ICON_MAP = { Building2, MapPin, FlaskConical, Wrench, Briefcase, DoorOpen, GraduationCap };

function TypeBadge({ typeId }) {
  const t = orgEntityTypes.find(x => x.id === typeId);
  if (!t) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 10,
      background: t.color + "14",
      fontFamily: fb, fontSize: 11, fontWeight: 600,
      color: t.color, whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
}

function FlagChips({ entity }) {
  const flags = [];
  if (entity.usesElectricity) flags.push({ icon: Zap, label: "Eléctrico", color: "var(--eco-warning, #CA8A04)" });
  if (entity.usesFuel)        flags.push({ icon: Flame, label: "Combustible", color: "var(--eco-danger, #DC2626)" });
  if (entity.hasDevices)      flags.push({ icon: Cpu, label: "Dispositivos", color: "var(--eco-info, #2563EB)" });
  if (entity.inReductionGoals) flags.push({ icon: Target, label: "Meta", color: "var(--eco-success, #16A34A)" });
  if (flags.length === 0) return <span style={{ opacity: .3, fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {flags.map(f => (
        <span key={f.label} title={f.label} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 22, height: 22, borderRadius: 5,
          background: f.color + "14",
        }}>
          <f.icon size={11} color={f.color} />
        </span>
      ))}
    </div>
  );
}

/* ── Tree node ───────────────────────────────────────────────────────── */
function TreeNode({ entity, children, level, onSelect, selectedId }) {
  const [open, setOpen] = React.useState(true);
  const hasChildren = children && children.length > 0;
  const t = orgEntityTypes.find(x => x.id === entity.type);
  const Icon = ICON_MAP[t?.icon] || Building2;
  const selected = selectedId === entity.id;

  return (
    <div style={{ marginLeft: level * 20 }}>
      <button
        onClick={() => onSelect(entity)}
        style={{
          width: "100%", border: "none", textAlign: "left",
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 8, cursor: "pointer",
          background: selected ? "rgba(34,197,94,.08)" : "transparent",
          borderLeft: selected ? "3px solid var(--eco-primary-500, #22C55E)" : "3px solid transparent",
          transition: "all .12s", opacity: entity.status === "inactive" ? .5 : 1,
        }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"; }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
      >
        {hasChildren ? (
          <span onClick={e => { e.stopPropagation(); setOpen(!open); }} style={{ cursor: "pointer", display: "flex" }}>
            {open ? <ChevronDown size={13} color="var(--eco-text-soft, #94A3B8)" /> : <ChevronRight size={13} color="var(--eco-text-soft, #94A3B8)" />}
          </span>
        ) : <span style={{ width: 13 }} />}
        <span style={{
          width: 24, height: 24, borderRadius: 6,
          background: (t?.color || "#64748B") + "14",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={12} color={t?.color || "#64748B"} />
        </span>
        <span style={{
          fontFamily: fb, fontSize: 13, fontWeight: selected ? 600 : 400,
          color: "var(--eco-text, #1E293B)", flex: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{entity.name}</span>
        <span style={{
          fontFamily: fb, fontSize: 10, color: t?.color || "#64748B",
          padding: "1px 6px", borderRadius: 4, background: (t?.color || "#64748B") + "10",
        }}>{t?.label}</span>
        {entity.status === "inactive" && (
          <AdminStatusBadge status="inactive" label="Inactivo" />
        )}
      </button>
      {open && hasChildren && children}
    </div>
  );
}

/* ── Build tree ──────────────────────────────────────────────────────── */
function buildTree(entities, parentId, campusId) {
  return entities
    .filter(e => e.parentId === parentId && e.campusId === campusId)
    .map(e => ({
      entity: e,
      children: buildTree(entities, e.id, campusId),
    }));
}

function renderTree(nodes, level, onSelect, selectedId) {
  return nodes.map(n => (
    <TreeNode
      key={n.entity.id}
      entity={n.entity}
      level={level}
      onSelect={onSelect}
      selectedId={selectedId}
    >
      {n.children.length > 0 && renderTree(n.children, level + 1, onSelect, selectedId)}
    </TreeNode>
  ));
}

const EMPTY_ENTITY = {
  name: "", type: "building", code: "", campusId: "campus-central",
  parentId: null, responsible: "", status: "active",
  usesElectricity: false, usesFuel: false, hasDevices: false, inReductionGoals: false,
  description: "",
};

export default function OrgStructurePage() {
  const [entities, setEntities] = React.useState(mockEntities);
  const [viewMode, setViewMode] = React.useState("tree");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [selectedEntity, setSelectedEntity] = React.useState(null);
  const [modalEntity, setModalEntity] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  const filtered = React.useMemo(() => {
    let list = [...entities];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q));
    }
    if (filters.type && filters.type !== "all") list = list.filter(e => e.type === filters.type);
    if (filters.campus && filters.campus !== "all") list = list.filter(e => e.campusId === filters.campus);
    if (filters.status && filters.status !== "all") list = list.filter(e => e.status === filters.status);
    return list;
  }, [entities, search, filters]);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      if (modalEntity.id) {
        setEntities(prev => prev.map(e => e.id === modalEntity.id ? { ...e, ...modalEntity } : e));
      } else {
        const ne = { ...modalEntity, id: "e" + Date.now() };
        setEntities(prev => [...prev, ne]);
      }
      setSaving(false);
      setModalEntity(null);
    }, 500);
  }

  const totalActive = entities.filter(e => e.status === "active").length;

  const tableColumns = [
    { key: "code", label: "Código", width: "10%", mono: true },
    {
      key: "name", label: "Nombre", width: "25%",
      render: (v) => (
        <span style={{ fontWeight: 500 }}>{v}</span>
      ),
    },
    { key: "type", label: "Tipo", width: "12%", render: (v) => <TypeBadge typeId={v} /> },
    {
      key: "campusId", label: "Campus", width: "14%",
      render: (v) => campuses.find(c => c.id === v)?.name || v,
    },
    { key: "responsible", label: "Responsable", width: "16%" },
    {
      key: "status", label: "Estado", width: "9%",
      render: (v) => <AdminStatusBadge status={v === "active" ? "success" : "inactive"} label={v === "active" ? "Activo" : "Inactivo"} />,
    },
    {
      key: "flags", label: "Operación", width: "10%",
      render: (_, row) => <FlagChips entity={row} />,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Estructura organizacional"
        subtitle={`${totalActive} entidades activas · ${campuses.length} campus`}
        icon={Network}
        breadcrumb={["Operación", "Estructura"]}
        actions={
          <button
            onClick={() => setModalEntity({ ...EMPTY_ENTITY })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)",
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: "pointer", transition: "all .12s",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)"}
          >
            <Plus size={14} /> Nueva entidad
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "tree", label: "Árbol organizacional" },
          { id: "table", label: "Vista tabular", count: filtered.length },
        ]}
        activeTab={viewMode}
        onChange={setViewMode}
      />

      {viewMode === "tree" ? (
        /* ── Tree view ──────────────────────────────────────────────── */
        <div style={{
          display: "flex", gap: 16,
          minHeight: 400,
        }}>
          {/* Tree panel */}
          <div style={{
            flex: "1 1 55%",
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12, padding: "16px 14px",
            overflowY: "auto", maxHeight: 560,
          }}>
            {campuses.map(campus => {
              const tree = buildTree(entities, null, campus.id);
              return (
                <div key={campus.id} style={{ marginBottom: 18 }}>
                  <div style={{
                    fontFamily: fd, fontSize: 12, fontWeight: 700,
                    color: "var(--eco-text-soft, #94A3B8)",
                    textTransform: "uppercase", letterSpacing: ".06em",
                    padding: "6px 12px", marginBottom: 4,
                    borderBottom: "1px solid var(--eco-border, #E2E8F0)",
                  }}>
                    {campus.name}
                  </div>
                  {renderTree(tree, 0, setSelectedEntity, selectedEntity?.id)}
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          <div style={{
            flex: "1 1 40%", minWidth: 280,
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12, padding: "20px 22px",
          }}>
            {selectedEntity ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h3 style={{
                      fontFamily: fd, fontSize: 16, fontWeight: 700,
                      color: "var(--eco-text, #1E293B)", margin: 0,
                    }}>{selectedEntity.name}</h3>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <TypeBadge typeId={selectedEntity.type} />
                      <AdminStatusBadge
                        status={selectedEntity.status === "active" ? "success" : "inactive"}
                        label={selectedEntity.status === "active" ? "Activo" : "Inactivo"}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setModalEntity({ ...selectedEntity })}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "6px 12px", borderRadius: 7,
                      border: "1px solid var(--eco-border, #E2E8F0)",
                      background: "transparent", cursor: "pointer",
                      fontFamily: fb, fontSize: 12, fontWeight: 500,
                      color: "var(--eco-text, #1E293B)", transition: "all .12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Edit3 size={12} /> Editar
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <DrawerField label="Código" mono>{selectedEntity.code}</DrawerField>
                  <DrawerField label="Campus">{campuses.find(c => c.id === selectedEntity.campusId)?.name}</DrawerField>
                  <DrawerField label="Responsable">{selectedEntity.responsible}</DrawerField>
                  <DrawerField label="Entidad padre">
                    {selectedEntity.parentId
                      ? entities.find(e => e.id === selectedEntity.parentId)?.name || "—"
                      : <span style={{ opacity: .4 }}>Raíz</span>
                    }
                  </DrawerField>
                </div>
                {selectedEntity.description && (
                  <div style={{ marginTop: 14 }}>
                    <DrawerField label="Descripción">{selectedEntity.description}</DrawerField>
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <span style={{
                    fontFamily: fb, fontSize: 11, fontWeight: 600,
                    color: "var(--eco-text-soft, #94A3B8)",
                    textTransform: "uppercase", letterSpacing: ".05em",
                  }}>Atributos operativos</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <FlagChips entity={selectedEntity} />
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                height: "100%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "var(--eco-text-soft, #94A3B8)", textAlign: "center",
                padding: 20,
              }}>
                <Network size={32} style={{ opacity: .3, marginBottom: 10 }} />
                <span style={{ fontFamily: fb, fontSize: 13 }}>Selecciona una entidad del árbol para ver su detalle</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Table view ─────────────────────────────────────────────── */
        <>
          <div style={{ marginBottom: 14 }}>
            <AdminFilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por nombre o código..."
              filters={[
                { key: "type", label: "Tipo", options: orgEntityTypes.map(t => ({ value: t.id, label: t.label })) },
                { key: "campus", label: "Campus", options: campuses.map(c => ({ value: c.id, label: c.name })) },
                { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
              ]}
              filterValues={filters}
              onFilterChange={(k, v) => setFilters(prev => ({ ...prev, [k]: v }))}
              onClear={() => { setSearch(""); setFilters({}); }}
            />
          </div>
          <AdminDataTable
            columns={tableColumns}
            data={filtered}
            sortable
            onRowClick={setSelectedEntity}
            maxHeight={480}
            emptyMessage="No se encontraron entidades con estos filtros."
          />
        </>
      )}

      {/* ── Create/Edit Modal ──────────────────────────────────────── */}
      <AdminFormModal
        open={!!modalEntity}
        onClose={() => setModalEntity(null)}
        title={modalEntity?.id ? "Editar entidad" : "Nueva entidad"}
        subtitle={modalEntity?.id ? modalEntity.code : "Registra una nueva entidad organizacional"}
        onSave={handleSave}
        saving={saving}
        width={560}
      >
        {modalEntity && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminTextField
                label="Nombre" required
                value={modalEntity.name}
                onChange={v => setModalEntity(p => ({ ...p, name: v }))}
                placeholder="Edificio A – Rectoría"
              />
              <AdminTextField
                label="Código interno"
                value={modalEntity.code}
                onChange={v => setModalEntity(p => ({ ...p, code: v }))}
                placeholder="CC-A"
              />
              <AdminSelectField
                label="Tipo" required
                value={modalEntity.type}
                onChange={v => setModalEntity(p => ({ ...p, type: v }))}
                options={orgEntityTypes.map(t => ({ value: t.id, label: t.label }))}
              />
              <AdminSelectField
                label="Campus"
                value={modalEntity.campusId}
                onChange={v => setModalEntity(p => ({ ...p, campusId: v }))}
                options={campuses.map(c => ({ value: c.id, label: c.name }))}
              />
              <AdminSelectField
                label="Entidad padre"
                value={modalEntity.parentId || ""}
                onChange={v => setModalEntity(p => ({ ...p, parentId: v || null }))}
                options={[
                  { value: "", label: "— Raíz (sin padre) —" },
                  ...entities
                    .filter(e => e.campusId === modalEntity.campusId && e.id !== modalEntity.id)
                    .map(e => ({ value: e.id, label: `${e.code} – ${e.name}` })),
                ]}
              />
              <AdminTextField
                label="Responsable"
                value={modalEntity.responsible}
                onChange={v => setModalEntity(p => ({ ...p, responsible: v }))}
                placeholder="Dr. Roberto Garza"
              />
              <AdminSelectField
                label="Estado"
                value={modalEntity.status}
                onChange={v => setModalEntity(p => ({ ...p, status: v }))}
                options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
              />
            </div>
            <AdminTextField
              label="Descripción" multiline rows={2}
              value={modalEntity.description}
              onChange={v => setModalEntity(p => ({ ...p, description: v }))}
            />
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              padding: "12px 0 0",
              borderTop: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <AdminToggleField
                label="Consumo eléctrico"
                checked={modalEntity.usesElectricity}
                onChange={v => setModalEntity(p => ({ ...p, usesElectricity: v }))}
              />
              <AdminToggleField
                label="Usa combustible"
                checked={modalEntity.usesFuel}
                onChange={v => setModalEntity(p => ({ ...p, usesFuel: v }))}
              />
              <AdminToggleField
                label="Tiene dispositivos"
                checked={modalEntity.hasDevices}
                onChange={v => setModalEntity(p => ({ ...p, hasDevices: v }))}
              />
              <AdminToggleField
                label="En metas de reducción"
                checked={modalEntity.inReductionGoals}
                onChange={v => setModalEntity(p => ({ ...p, inReductionGoals: v }))}
              />
            </div>
          </>
        )}
      </AdminFormModal>

      {/* ── Detail Drawer (from table row click) ───────────────────── */}
      {viewMode === "table" && (
        <AdminEntityDrawer
          open={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          title={selectedEntity?.name}
          subtitle={selectedEntity?.code}
          badge={selectedEntity && <TypeBadge typeId={selectedEntity.type} />}
          actions={selectedEntity && (
            <button onClick={() => { setModalEntity({ ...selectedEntity }); setSelectedEntity(null); }} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              fontFamily: fb, fontSize: 12.5, fontWeight: 500,
              color: "var(--eco-text, #1E293B)", cursor: "pointer",
            }}>
              <Edit3 size={12} /> Editar
            </button>
          )}
        >
          {selectedEntity && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <DrawerField label="Campus">{campuses.find(c => c.id === selectedEntity.campusId)?.name}</DrawerField>
                <DrawerField label="Responsable">{selectedEntity.responsible}</DrawerField>
                <DrawerField label="Estado">
                  <AdminStatusBadge
                    status={selectedEntity.status === "active" ? "success" : "inactive"}
                    label={selectedEntity.status === "active" ? "Activo" : "Inactivo"}
                  />
                </DrawerField>
                <DrawerField label="Entidad padre">
                  {selectedEntity.parentId ? entities.find(e => e.id === selectedEntity.parentId)?.name : "Raíz"}
                </DrawerField>
              </div>
              {selectedEntity.description && <DrawerField label="Descripción">{selectedEntity.description}</DrawerField>}
              <div>
                <span style={{
                  fontFamily: fb, fontSize: 11, fontWeight: 600,
                  color: "var(--eco-text-soft, #94A3B8)",
                  textTransform: "uppercase", letterSpacing: ".05em",
                }}>Atributos operativos</span>
                <div style={{ marginTop: 8 }}><FlagChips entity={selectedEntity} /></div>
              </div>
            </>
          )}
        </AdminEntityDrawer>
      )}
    </>
  );
}
