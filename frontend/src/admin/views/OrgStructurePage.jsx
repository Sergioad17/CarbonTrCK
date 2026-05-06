import React from "react";
import {
  Network, Plus, ChevronDown, ChevronRight, Edit3, Zap, Flame,
  Cpu, Target, Building2, MapPin, FlaskConical, Wrench,
  Briefcase, DoorOpen, GraduationCap, Landmark, Users, FileText,
  Search, Trash2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import {
  createOrgCampus,
  createOrgEntity,
  deleteOrgCampus,
  deleteOrgEntity,
  fetchOrgStructure,
  updateOrgCampus,
  updateOrgEntity,
} from "../../api/admin";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const ICON_MAP = { Building2, MapPin, FlaskConical, Wrench, Briefcase, DoorOpen, GraduationCap };
const orgEntityTypes = [
  { id: "building", label: "Edificio", icon: "Building2", color: "#2563EB" },
  { id: "area", label: "Área", icon: "MapPin", color: "#7C3AED" },
  { id: "department", label: "Departamento", icon: "Briefcase", color: "#0891B2" },
  { id: "laboratory", label: "Laboratorio", icon: "FlaskConical", color: "#DC2626" },
  { id: "workshop", label: "Taller", icon: "Wrench", color: "#EA580C" },
  { id: "office", label: "Oficina", icon: "DoorOpen", color: "#64748B" },
  { id: "classroom", label: "Salón", icon: "GraduationCap", color: "#059669" },
  { id: "zone", label: "Zona operativa", icon: "MapPin", color: "#CA8A04" },
];

const EMPTY_CAMPUS = {
  name: "",
  code: "",
  city: "",
  responsible: "",
  status: "active",
  notes: "",
};

const EMPTY_ENTITY = {
  name: "",
  type: "building",
  code: "",
  campusId: "",
  parentId: null,
  responsible: "",
  status: "active",
  usesElectricity: false,
  usesFuel: false,
  hasDevices: false,
  inReductionGoals: false,
  description: "",
};

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
  if (entity.usesFuel) flags.push({ icon: Flame, label: "Combustible", color: "var(--eco-danger, #DC2626)" });
  if (entity.hasDevices) flags.push({ icon: Cpu, label: "Dispositivos", color: "var(--eco-info, #2563EB)" });
  if (entity.inReductionGoals) flags.push({ icon: Target, label: "Meta", color: "var(--eco-success, #16A34A)" });
  if (flags.length === 0) return <span style={{ opacity: .35, fontSize: 11 }}>Sin atributos</span>;
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

function CampusSummary({ campus, entities, onEdit, onDelete }) {
  const [hovered, setHovered] = React.useState(false);
  const related = entities.filter(entity => entity.campusId === campus.id);
  const active = related.filter(entity => entity.status === "active").length;
  const inactive = related.length - active;
  const isInactive = campus.status === "inactive";
  const canDelete = related.length === 0;
  const disabledReason = canDelete
    ? null
    : `No se puede eliminar: ${related.length} ${related.length === 1 ? "entidad asociada" : "entidades asociadas"}.`;
  const accent = isInactive
    ? "var(--eco-text-soft, #94A3B8)"
    : "var(--eco-primary-500, #22C55E)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: "var(--eco-card, #fff)",
        border: "1px solid var(--eco-border, #E2E8F0)",
        borderRadius: 12,
        padding: "20px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: isInactive ? 0.78 : 1,
        boxShadow: hovered ? "var(--eco-shadow-md)" : "var(--eco-shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "box-shadow .18s ease, transform .18s ease",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent, opacity: isInactive ? 0.4 : 0.85,
      }} />

      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--eco-primary-50, rgba(34,197,94,.10))",
            color: "var(--eco-primary-600, #16A34A)",
            border: "1px solid var(--eco-primary-100, rgba(34,197,94,.18))",
            flexShrink: 0,
          }}>
            <Landmark size={19} strokeWidth={2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              margin: 0, fontFamily: fd, fontSize: 15.5, fontWeight: 700,
              color: "var(--eco-text-strong, #0F172A)", lineHeight: 1.25,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {campus.name}
            </h3>
            <div style={{
              marginTop: 4,
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #64748B)",
            }}>
              <span style={{
                fontFamily: fm, fontWeight: 600, letterSpacing: ".02em",
                color: "var(--eco-text-soft, #64748B)",
              }}>
                {campus.code}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={11} strokeWidth={2} />
                {campus.city || "Sin ciudad"}
              </span>
            </div>
          </div>
        </div>
        <AdminStatusBadge
          variant={isInactive ? "neutral" : "success"}
          label={isInactive ? "Inactivo" : "Activo"}
        />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
      }}>
        <MiniMetric label="Entidades" value={related.length} />
        <MiniMetric label="Activas" value={active} accent="success" />
        <MiniMetric label="Inactivas" value={inactive} accent="muted" />
      </div>

      {campus.notes && (
        <div style={{
          padding: "10px 12px", borderRadius: 8,
          background: "var(--eco-card-muted, #F8FAFC)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <FileText size={12} color="var(--eco-text-soft, #94A3B8)" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{
            fontFamily: fb, fontSize: 11.5, lineHeight: 1.5,
            color: "var(--eco-text-soft, #64748B)",
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2,
            overflow: "hidden",
          }}>
            {campus.notes}
          </span>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, paddingTop: 12,
        borderTop: "1px solid var(--eco-border, #E2E8F0)",
      }}>
        <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--eco-card-muted, #F1F5F9)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            color: "var(--eco-text-soft, #94A3B8)",
            flexShrink: 0,
          }}>
            <Users size={13} strokeWidth={2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: fb, fontSize: 9.5, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: ".06em",
              color: "var(--eco-text-soft, #94A3B8)",
            }}>
              Responsable
            </div>
            <div style={{
              marginTop: 1, fontFamily: fb, fontSize: 12.5, fontWeight: 500,
              color: "var(--eco-text, #1E293B)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: 180,
            }}>
              {campus.responsible || (
                <span style={{ opacity: 0.55, fontStyle: "italic" }}>Sin asignar</span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(campus)}
            title="Editar campus"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              color: "var(--eco-text, #1E293B)",
              fontFamily: fb, fontSize: 12, fontWeight: 500,
              cursor: "pointer",
              transition: "background .15s, border-color .15s, color .15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--eco-primary-50, rgba(34,197,94,.08))";
              e.currentTarget.style.borderColor = "var(--eco-primary-400, #4ADE80)";
              e.currentTarget.style.color = "var(--eco-primary-600, #16A34A)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--eco-card, #fff)";
              e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
              e.currentTarget.style.color = "var(--eco-text, #1E293B)";
            }}
          >
            <Edit3 size={12} /> Editar
          </button>
          <DeleteButton
            onClick={() => onDelete?.(campus)}
            disabled={!canDelete}
            disabledReason={disabledReason}
            iconOnly
          />
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  const valueColor = accent === "success"
    ? "var(--eco-success, #16A34A)"
    : accent === "muted"
      ? "var(--eco-text-soft, #94A3B8)"
      : "var(--eco-text-strong, #0F172A)";
  return (
    <div style={{
      minWidth: 0,
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card-muted, #F8FAFC)",
      borderRadius: 8,
      padding: "8px 10px",
    }}>
      <div style={{
        fontFamily: fb,
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".06em",
        color: "var(--eco-text-soft, #64748B)",
      }}>
        {label}
      </div>
      <div style={{
        marginTop: 4,
        fontFamily: fm,
        fontSize: 17,
        fontWeight: 700,
        color: valueColor,
        lineHeight: 1.1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {value}
      </div>
    </div>
  );
}

function DeleteButton({ onClick, disabled, disabledReason, size = "md", iconOnly = false }) {
  const dims = size === "sm"
    ? { padding: "4px 9px", iconSize: 11, fontSize: 11, height: 26 }
    : { padding: "6px 12px", iconSize: 12, fontSize: 12, height: undefined };

  const title = disabled
    ? (disabledReason || "No se puede eliminar")
    : "Eliminar";

  const baseStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
    padding: iconOnly ? 0 : dims.padding,
    width: iconOnly ? dims.height || 30 : undefined,
    height: iconOnly ? dims.height || 30 : undefined,
    borderRadius: 8,
    border: "1px solid var(--eco-border, #E2E8F0)",
    background: "var(--eco-card, #fff)",
    color: disabled ? "var(--eco-text-soft, #94A3B8)" : "var(--eco-danger, #DC2626)",
    fontFamily: fb, fontSize: dims.fontSize, fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    flexShrink: 0,
    transition: "background .15s, border-color .15s, color .15s",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onClick?.(e);
      }}
      disabled={disabled}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--eco-danger-bg, rgba(239,68,68,.08))";
        e.currentTarget.style.borderColor = "var(--eco-danger, #DC2626)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--eco-card, #fff)";
        e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
      }}
    >
      <Trash2 size={dims.iconSize} />
      {!iconOnly && "Eliminar"}
    </button>
  );
}

function CampusOverviewStat({ icon: Icon, label, value, accent = "neutral" }) {
  const palette = {
    primary: { bg: "var(--eco-primary-50, rgba(34,197,94,.10))", color: "var(--eco-primary-600, #16A34A)" },
    success: { bg: "var(--eco-success-bg, rgba(34,197,94,.10))", color: "var(--eco-success, #16A34A)" },
    info: { bg: "var(--eco-info-bg, rgba(37,99,235,.10))", color: "var(--eco-info, #2563EB)" },
    neutral: { bg: "var(--eco-card-muted, #F1F5F9)", color: "var(--eco-text-soft, #64748B)" },
  }[accent] || { bg: "var(--eco-card-muted, #F1F5F9)", color: "var(--eco-text-soft, #64748B)" };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 10,
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      minWidth: 0,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 9,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: palette.bg, color: palette.color,
        flexShrink: 0,
      }}>
        <Icon size={17} strokeWidth={2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: fb, fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: ".06em",
          color: "var(--eco-text-soft, #94A3B8)",
        }}>
          {label}
        </div>
        <div style={{
          marginTop: 2, fontFamily: fm, fontSize: 18, fontWeight: 700,
          color: "var(--eco-text-strong, #0F172A)", lineHeight: 1.1,
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

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

export default function OrgStructurePage() {
  const [campuses, setCampuses] = React.useState([]);
  const [entities, setEntities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [viewMode, setViewMode] = React.useState("tree");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [selectedEntity, setSelectedEntity] = React.useState(null);
  const [modalEntity, setModalEntity] = React.useState(null);
  const [modalCampus, setModalCampus] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [campusSearch, setCampusSearch] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadStructure = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const structure = await fetchOrgStructure();
      setCampuses(Array.isArray(structure?.campuses) ? structure.campuses : []);
      setEntities(Array.isArray(structure?.entities) ? structure.entities : []);
      setSelectedEntity(null);
    } catch (error) {
      console.error("admin_org_structure_load_failed", error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  const entityChildrenCount = React.useCallback(
    (entityId) => entities.filter(e => e.parentId === entityId).length,
    [entities],
  );

  const campusEntitiesCount = React.useCallback(
    (campusId) => entities.filter(e => e.campusId === campusId).length,
    [entities],
  );

  function requestDeleteCampus(campus) {
    if (!campus) return;
    const count = campusEntitiesCount(campus.id);
    if (count > 0) return;
    setConfirmDelete({ kind: "campus", item: campus });
  }

  function requestDeleteEntity(entity) {
    if (!entity) return;
    const count = entityChildrenCount(entity.id);
    if (count > 0) return;
    setConfirmDelete({ kind: "entity", item: entity });
  }

  async function performDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.kind === "campus") {
        const id = confirmDelete.item.id;
        await deleteOrgCampus(id);
        setCampuses(prev => prev.filter(c => c.id !== id));
      } else if (confirmDelete.kind === "entity") {
        const id = confirmDelete.item.id;
        await deleteOrgEntity(id);
        setEntities(prev => prev.filter(e => e.id !== id));
        setSelectedEntity(prev => (prev?.id === id ? null : prev));
      }
      setConfirmDelete(null);
      await loadStructure();
    } catch (error) {
      console.error("admin_org_structure_delete_failed", error);
      await loadStructure();
    } finally {
      setDeleting(false);
    }
  }

  const activeCampuses = campuses.filter(campus => campus.status !== "inactive");

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

  const campusTableData = React.useMemo(() => campuses.map(campus => {
    const related = entities.filter(entity => entity.campusId === campus.id);
    return {
      ...campus,
      entityCount: related.length,
      activeEntityCount: related.filter(entity => entity.status === "active").length,
    };
  }), [campuses, entities]);

  function openNewEntity() {
    setModalEntity({
      ...EMPTY_ENTITY,
      campusId: activeCampuses[0]?.id || campuses[0]?.id || EMPTY_ENTITY.campusId,
    });
  }

  function openNewCampus() {
    setModalCampus({ ...EMPTY_CAMPUS });
  }

  async function handleSaveEntity() {
    if (!modalEntity) return;
    setSaving(true);
    try {
      if (modalEntity.id) {
        const saved = await updateOrgEntity(modalEntity.id, modalEntity);
        setEntities(prev => prev.map(e => e.id === saved.id ? saved : e));
        setSelectedEntity(prev => (prev?.id === saved.id ? saved : prev));
      } else {
        const saved = await createOrgEntity(modalEntity);
        setEntities(prev => [...prev, saved]);
      }
      setModalEntity(null);
      await loadStructure();
    } catch (error) {
      console.error("admin_org_structure_entity_save_failed", error);
      await loadStructure();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCampus() {
    if (!modalCampus) return;
    setSaving(true);
    try {
      const normalized = {
        ...modalCampus,
        name: String(modalCampus.name || "").trim() || "Nuevo campus",
        city: String(modalCampus.city || "").trim(),
        responsible: String(modalCampus.responsible || "").trim(),
        notes: String(modalCampus.notes || "").trim(),
        status: modalCampus.status || "active",
      };

      if (modalCampus.id) {
        const saved = await updateOrgCampus(modalCampus.id, normalized);
        setCampuses(prev => prev.map(campus => campus.id === saved.id ? saved : campus));
      } else {
        const saved = await createOrgCampus(normalized);
        setCampuses(prev => [...prev, saved]);
      }

      setModalCampus(null);
      await loadStructure();
    } catch (error) {
      console.error("admin_org_structure_campus_save_failed", error);
      await loadStructure();
    } finally {
      setSaving(false);
    }
  }

  const totalActive = entities.filter(e => e.status === "active").length;

  const tableColumns = [
    { key: "code", label: "Código", width: "10%", mono: true },
    {
      key: "name", label: "Nombre", width: "25%",
      render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
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

  const campusColumns = [
    {
      key: "name",
      label: "Campus",
      width: "26%",
      render: (v, row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "var(--eco-primary-50, rgba(34,197,94,.10))",
            color: "var(--eco-primary-600, #16A34A)",
            border: "1px solid var(--eco-primary-100, rgba(34,197,94,.18))",
            flexShrink: 0,
          }}>
            <Landmark size={13} strokeWidth={2} />
          </span>
          <span style={{
            color: "var(--eco-text-strong, #0F172A)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {v}
          </span>
        </span>
      ),
    },
    { key: "code", label: "Código", width: "12%", mono: true },
    {
      key: "city", label: "Ciudad", width: "16%",
      render: (v) => v
        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} color="var(--eco-text-soft, #94A3B8)" />
            {v}
          </span>
        : <span style={{ color: "var(--eco-text-soft, #94A3B8)", fontStyle: "italic" }}>Sin ciudad</span>,
    },
    {
      key: "responsible", label: "Responsable", width: "20%",
      render: (v) => v || <span style={{ color: "var(--eco-text-soft, #94A3B8)", fontStyle: "italic" }}>Sin asignar</span>,
    },
    { key: "entityCount", label: "Entidades", width: "10%", align: "right", mono: true },
    { key: "activeEntityCount", label: "Activas", width: "10%", align: "right", mono: true },
    {
      key: "status",
      label: "Estado",
      width: "10%",
      render: (v) => <AdminStatusBadge variant={v === "active" ? "success" : "neutral"} label={v === "active" ? "Activo" : "Inactivo"} />,
    },
  ];

  if (loading || loadError) {
    return <AdminLoadingScreen />;
  }

  return (
    <>
      <AdminPageHeader
        title="Estructura organizacional"
        subtitle={`${totalActive} entidades activas · ${campuses.length} campus`}
        icon={Network}
        breadcrumb={["Operación", "Estructura"]}
        actions={
          <button
            onClick={viewMode === "campuses" ? openNewCampus : openNewEntity}
            disabled={viewMode !== "campuses" && campuses.length < 1}
            title={viewMode !== "campuses" && campuses.length < 1 ? "Registra un campus antes de crear entidades." : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 8, border: "none",
              background: "var(--eco-primary-500, #22C55E)",
              fontFamily: fb, fontSize: 13, fontWeight: 600,
              color: "#fff", cursor: viewMode !== "campuses" && campuses.length < 1 ? "not-allowed" : "pointer", transition: "all .12s",
              opacity: viewMode !== "campuses" && campuses.length < 1 ? 0.55 : 1,
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={e => {
              if (e.currentTarget.disabled) return;
              e.currentTarget.style.background = "var(--eco-primary-600, #16A34A)";
            }}
            onMouseLeave={e => {
              if (e.currentTarget.disabled) return;
              e.currentTarget.style.background = "var(--eco-primary-500, #22C55E)";
            }}
          >
            <Plus size={14} /> {viewMode === "campuses" ? "Nuevo campus" : "Nueva entidad"}
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "tree", label: "Árbol organizacional" },
          { id: "table", label: "Vista tabular", count: filtered.length },
          { id: "campuses", label: "Campus", count: campuses.length },
        ]}
        activeTab={viewMode}
        onChange={setViewMode}
      />

      {viewMode === "tree" && (
        <div style={{ display: "flex", gap: 16, minHeight: 400 }}>
          <div style={{
            flex: "1 1 55%",
            background: "var(--eco-card, #fff)",
            border: "1px solid var(--eco-border, #E2E8F0)",
            borderRadius: 12, padding: "16px 14px",
            overflowY: "auto", maxHeight: 560,
          }}>
            {campuses.map(campus => {
              const tree = buildTree(entities, null, campus.id);
              const isInactive = campus.status === "inactive";
              const campusChildCount = campusEntitiesCount(campus.id);
              const campusCanDelete = campusChildCount === 0;
              const campusDisabledReason = campusCanDelete
                ? null
                : `No se puede eliminar: ${campusChildCount} ${campusChildCount === 1 ? "entidad asociada" : "entidades asociadas"}.`;
              return (
                <div key={campus.id} style={{ marginBottom: 18, opacity: isInactive ? 0.6 : 1 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 12px",
                    marginBottom: 6,
                    borderBottom: "1px solid var(--eco-border, #E2E8F0)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: "var(--eco-primary-50, rgba(34,197,94,.10))",
                        color: "var(--eco-primary-600, #16A34A)",
                        flexShrink: 0,
                      }}>
                        <Landmark size={12} strokeWidth={2.2} />
                      </span>
                      <span style={{
                        fontFamily: fd, fontSize: 12, fontWeight: 700,
                        color: "var(--eco-text-soft, #94A3B8)",
                        textTransform: "uppercase", letterSpacing: ".05em",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {campus.name}
                      </span>
                      <span style={{
                        fontFamily: fm, fontSize: 10.5, fontWeight: 600,
                        color: "var(--eco-text-soft, #94A3B8)",
                        padding: "1px 6px", borderRadius: 5,
                        background: "var(--eco-card-muted, #F1F5F9)",
                        border: "1px solid var(--eco-border, #E2E8F0)",
                        flexShrink: 0,
                      }}>
                        {campus.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setModalCampus({ ...campus })}
                        title="Editar campus"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "4px 9px", borderRadius: 7,
                          border: "1px solid var(--eco-border, #E2E8F0)",
                          background: "var(--eco-card, #fff)",
                          color: "var(--eco-text-soft, #64748B)",
                          fontFamily: fb, fontSize: 11, fontWeight: 500,
                          cursor: "pointer",
                          transition: "background .15s, border-color .15s, color .15s",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = "var(--eco-primary-50, rgba(34,197,94,.08))";
                          e.currentTarget.style.borderColor = "var(--eco-primary-400, #4ADE80)";
                          e.currentTarget.style.color = "var(--eco-primary-600, #16A34A)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "var(--eco-card, #fff)";
                          e.currentTarget.style.borderColor = "var(--eco-border, #E2E8F0)";
                          e.currentTarget.style.color = "var(--eco-text-soft, #64748B)";
                        }}
                      >
                        <Edit3 size={11} /> Editar
                      </button>
                      <DeleteButton
                        size="sm"
                        iconOnly
                        onClick={() => requestDeleteCampus(campus)}
                        disabled={!campusCanDelete}
                        disabledReason={campusDisabledReason}
                      />
                    </div>
                  </div>
                  {tree.length > 0
                    ? renderTree(tree, 0, setSelectedEntity, selectedEntity?.id)
                    : (
                      <div style={{
                        padding: "12px 14px",
                        margin: "0 4px",
                        borderRadius: 8,
                        background: "var(--eco-card-muted, #F8FAFC)",
                        border: "1px dashed var(--eco-border, #E2E8F0)",
                        fontFamily: fb,
                        fontSize: 12,
                        color: "var(--eco-text-soft, #64748B)",
                        textAlign: "center",
                      }}>
                        Sin entidades registradas en este campus.
                      </div>
                    )}
                </div>
              );
            })}
          </div>

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
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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
                    {(() => {
                      const childCount = entityChildrenCount(selectedEntity.id);
                      const canDel = childCount === 0;
                      return (
                        <DeleteButton
                          iconOnly
                          onClick={() => requestDeleteEntity(selectedEntity)}
                          disabled={!canDel}
                          disabledReason={canDel
                            ? null
                            : `No se puede eliminar: ${childCount} ${childCount === 1 ? "entidad hija" : "entidades hijas"}.`}
                        />
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <DrawerField label="Código" mono>{selectedEntity.code}</DrawerField>
                  <DrawerField label="Campus">{campuses.find(c => c.id === selectedEntity.campusId)?.name}</DrawerField>
                  <DrawerField label="Responsable">{selectedEntity.responsible || "Sin asignar"}</DrawerField>
                  <DrawerField label="Entidad padre">
                    {selectedEntity.parentId
                      ? entities.find(e => e.id === selectedEntity.parentId)?.name || "No disponible"
                      : <span style={{ opacity: .45 }}>Raíz</span>
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
                    textTransform: "uppercase",
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
                <Network size={32} style={{ opacity: .35, marginBottom: 10 }} />
                <span style={{ fontFamily: fb, fontSize: 13 }}>Selecciona una entidad del árbol para ver su detalle.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "table" && (
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

      {viewMode === "campuses" && (() => {
        const totalCampuses = campuses.length;
        const activeCampusCount = campuses.filter(c => c.status === "active").length;
        const inactiveCampusCount = totalCampuses - activeCampusCount;
        const totalEntities = entities.length;
        const cq = campusSearch.trim().toLowerCase();
        const visibleCampuses = cq
          ? campuses.filter(c =>
              c.name.toLowerCase().includes(cq) ||
              c.code.toLowerCase().includes(cq) ||
              (c.city || "").toLowerCase().includes(cq) ||
              (c.responsible || "").toLowerCase().includes(cq)
            )
          : campuses;
        const visibleTableData = cq
          ? campusTableData.filter(c =>
              c.name.toLowerCase().includes(cq) ||
              c.code.toLowerCase().includes(cq) ||
              (c.city || "").toLowerCase().includes(cq) ||
              (c.responsible || "").toLowerCase().includes(cq)
            )
          : campusTableData;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}>
              <CampusOverviewStat icon={Landmark} label="Total de campus" value={totalCampuses} accent="primary" />
              <CampusOverviewStat icon={Building2} label="Campus activos" value={activeCampusCount} accent="success" />
              <CampusOverviewStat icon={DoorOpen} label="Campus inactivos" value={inactiveCampusCount} accent="neutral" />
              <CampusOverviewStat icon={Network} label="Entidades vinculadas" value={totalEntities} accent="info" />
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              padding: "10px 12px",
              background: "var(--eco-card, #fff)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              borderRadius: 10,
            }}>
              <div style={{
                position: "relative", flex: "1 1 280px", minWidth: 220,
              }}>
                <Search
                  size={14}
                  color="var(--eco-text-soft, #94A3B8)"
                  style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  placeholder="Buscar campus por nombre, código, ciudad o responsable..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "8px 14px 8px 34px",
                    fontFamily: fb, fontSize: 13,
                    color: "var(--eco-text, #1E293B)",
                    background: "var(--eco-input-bg, #fff)",
                    border: "1px solid var(--eco-border, #E2E8F0)",
                    borderRadius: 8, outline: "none",
                    transition: "border-color .15s, box-shadow .15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--eco-primary-400, #4ADE80)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(34,197,94,.12)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--eco-border, #E2E8F0)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
              <span style={{
                fontFamily: fb, fontSize: 12,
                color: "var(--eco-text-soft, #64748B)",
                whiteSpace: "nowrap",
              }}>
                {visibleCampuses.length} {visibleCampuses.length === 1 ? "campus visible" : "campus visibles"}
              </span>
            </div>

            {visibleCampuses.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 14,
              }}>
                {visibleCampuses.map(campus => (
                  <CampusSummary
                    key={campus.id}
                    campus={campus}
                    entities={entities}
                    onEdit={(item) => setModalCampus({ ...item })}
                    onDelete={requestDeleteCampus}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                padding: "48px 24px",
                background: "var(--eco-card, #fff)",
                border: "1px dashed var(--eco-border, #E2E8F0)",
                borderRadius: 12,
                textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <span style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "var(--eco-card-muted, #F1F5F9)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: "var(--eco-text-soft, #94A3B8)",
                }}>
                  <Landmark size={22} strokeWidth={1.5} />
                </span>
                <div style={{
                  fontFamily: fd, fontSize: 14, fontWeight: 700,
                  color: "var(--eco-text, #1E293B)",
                }}>
                  {cq ? "Sin coincidencias" : "Aún no hay campus registrados"}
                </div>
                <div style={{
                  fontFamily: fb, fontSize: 12.5,
                  color: "var(--eco-text-soft, #64748B)",
                  maxWidth: 360, lineHeight: 1.5,
                }}>
                  {cq
                    ? "Ningún campus coincide con la búsqueda actual."
                    : "Crea un campus para comenzar a organizar la estructura de la institución."}
                </div>
                {!cq && (
                  <button
                    onClick={openNewCampus}
                    style={{
                      marginTop: 6,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: "var(--eco-primary-500, #22C55E)",
                      fontFamily: fb, fontSize: 13, fontWeight: 600,
                      color: "#fff", cursor: "pointer",
                    }}
                  >
                    <Plus size={14} /> Nuevo campus
                  </button>
                )}
              </div>
            )}

            <div style={{
              background: "var(--eco-card, #fff)",
              border: "1px solid var(--eco-border, #E2E8F0)",
              borderRadius: 12,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--eco-border, #E2E8F0)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div>
                  <div style={{
                    fontFamily: fd, fontSize: 13.5, fontWeight: 700,
                    color: "var(--eco-text, #1E293B)",
                  }}>
                    Detalle de campus
                  </div>
                  <div style={{
                    marginTop: 2, fontFamily: fb, fontSize: 11.5,
                    color: "var(--eco-text-soft, #64748B)",
                  }}>
                    Haz clic en una fila para editar el campus.
                  </div>
                </div>
              </div>
              <AdminDataTable
                columns={campusColumns}
                data={visibleTableData}
                sortable
                onRowClick={(campus) => setModalCampus({ ...campus })}
                emptyMessage="No hay campus para mostrar."
              />
            </div>
          </div>
        );
      })()}

      <AdminFormModal
        open={!!modalCampus}
        onClose={() => setModalCampus(null)}
        title={modalCampus?.id ? "Editar campus" : "Nuevo campus"}
        subtitle={modalCampus?.id ? modalCampus.code : "Registra una sede o campus de la institución"}
        onSave={handleSaveCampus}
        saving={saving}
        width={580}
      >
        {modalCampus && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminTextField
                label="Nombre del campus"
                required
                value={modalCampus.name}
                onChange={v => setModalCampus(p => ({ ...p, name: v }))}
                placeholder="Campus Central"
              />
              <AdminTextField
                label="Código"
                value={modalCampus.code}
                onChange={v => setModalCampus(p => ({ ...p, code: v }))}
                placeholder="CAMPUS-CT"
                hint="Se normaliza en mayúsculas al guardar."
              />
              <AdminTextField
                label="Ciudad"
                value={modalCampus.city}
                onChange={v => setModalCampus(p => ({ ...p, city: v }))}
                placeholder="Ciudad Mante"
              />
              <AdminTextField
                label="Responsable"
                value={modalCampus.responsible}
                onChange={v => setModalCampus(p => ({ ...p, responsible: v }))}
                placeholder="Responsable del campus"
              />
              <AdminSelectField
                label="Estado"
                value={modalCampus.status}
                onChange={v => setModalCampus(p => ({ ...p, status: v }))}
                options={[{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
              />
            </div>
            <AdminTextField
              label="Notas"
              multiline
              rows={3}
              value={modalCampus.notes}
              onChange={v => setModalCampus(p => ({ ...p, notes: v }))}
              placeholder="Información operativa o administrativa del campus"
            />
          </>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={!!modalEntity}
        onClose={() => setModalEntity(null)}
        title={modalEntity?.id ? "Editar entidad" : "Nueva entidad"}
        subtitle={modalEntity?.id ? modalEntity.code : "Registra una nueva entidad organizacional"}
        onSave={handleSaveEntity}
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
                placeholder="Edificio A - Rectoría"
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
                onChange={v => setModalEntity(p => ({ ...p, campusId: v, parentId: null }))}
                options={campuses.map(c => ({ value: c.id, label: c.name }))}
              />
              <AdminSelectField
                label="Entidad padre"
                value={modalEntity.parentId || ""}
                onChange={v => setModalEntity(p => ({ ...p, parentId: v || null }))}
                options={[
                  { value: "", label: "Raíz (sin padre)" },
                  ...entities
                    .filter(e => e.campusId === modalEntity.campusId && e.id !== modalEntity.id)
                    .map(e => ({ value: e.id, label: `${e.code} - ${e.name}` })),
                ]}
              />
              <AdminTextField
                label="Responsable"
                value={modalEntity.responsible}
                onChange={v => setModalEntity(p => ({ ...p, responsible: v }))}
                placeholder="Responsable operativo"
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

      {viewMode === "table" && (
        <AdminEntityDrawer
          open={!!selectedEntity}
          onClose={() => setSelectedEntity(null)}
          title={selectedEntity?.name}
          subtitle={selectedEntity?.code}
          badge={selectedEntity && <TypeBadge typeId={selectedEntity.type} />}
          actions={selectedEntity && (() => {
            const childCount = entityChildrenCount(selectedEntity.id);
            const canDel = childCount === 0;
            return (
              <div style={{ display: "flex", gap: 8 }}>
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
                <DeleteButton
                  onClick={() => requestDeleteEntity(selectedEntity)}
                  disabled={!canDel}
                  disabledReason={canDel
                    ? null
                    : `No se puede eliminar: ${childCount} ${childCount === 1 ? "entidad hija" : "entidades hijas"}.`}
                />
              </div>
            );
          })()}
        >
          {selectedEntity && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <DrawerField label="Campus">{campuses.find(c => c.id === selectedEntity.campusId)?.name}</DrawerField>
                <DrawerField label="Responsable">{selectedEntity.responsible || "Sin asignar"}</DrawerField>
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
                  textTransform: "uppercase",
                }}>Atributos operativos</span>
                <div style={{ marginTop: 8 }}><FlagChips entity={selectedEntity} /></div>
              </div>
            </>
          )}
        </AdminEntityDrawer>
      )}

      <AdminConfirmDialog
        open={!!confirmDelete}
        onClose={() => { if (!deleting) setConfirmDelete(null); }}
        onConfirm={performDelete}
        loading={deleting}
        danger
        title={confirmDelete?.kind === "campus" ? "Eliminar campus" : "Eliminar entidad"}
        message={confirmDelete
          ? confirmDelete.kind === "campus"
            ? `Vas a eliminar el campus "${confirmDelete.item.name}" (${confirmDelete.item.code}). Esta acción no se puede deshacer.`
            : `Vas a eliminar la entidad "${confirmDelete.item.name}" (${confirmDelete.item.code}). Esta acción no se puede deshacer.`
          : ""}
        confirmLabel="Eliminar"
      />
    </>
  );
}
