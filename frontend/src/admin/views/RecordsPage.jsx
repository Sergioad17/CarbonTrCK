import React from "react";
import {
  AlertTriangle,
  Building2,
  Database,
  Download,
  FileText,
  History,
  MapPin,
  Paperclip,
  RefreshCw,
  X,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminLoadingScreen from "../components/AdminLoadingScreen";
import { fetchOrgStructure } from "../../api/admin";
import {
  fetchEmissionRecord,
  fetchEmissionRecordRevisions,
  fetchEmissionRecords,
} from "../../api/records";
import { getSession } from "../../lib/sessionStore";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const EMPTY_NOTICE = { type: "", message: "" };

const STATUS_META = {
  real: { variant: "success", label: "Real" },
  est: { variant: "warning", label: "Estimacion" },
};

const SCOPE_LABELS = {
  scope1: "Scope 1",
  scope2: "Scope 2",
  scope3: "Scope 3",
};

const CATEGORY_LABELS = {
  electricidad: "Electricidad",
  combustible: "Combustible",
  agua: "Agua",
  otros: "Otros",
};

const SOURCE_OPTIONS = [
  { value: "recibo", label: "Recibo" },
  { value: "medicion", label: "Medicion" },
  { value: "encuesta", label: "Encuesta" },
  { value: "inventario", label: "Inventario" },
  { value: "estimacion", label: "Estimacion" },
];

const REVISION_REASON_LABELS = {
  create: "Capturo el registro",
  archive: "Archivo el registro",
  update: "Actualizo el registro",
  approve: "Aprobo el registro",
};

function normalizeText(value) {
  return String(value ?? "").trim();
}

function formatNumber(value, fractionDigits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("es-MX", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("es-MX");
}

function formatDate(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return "Sin fecha";
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;
  return date.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(value) {
  const cleaned = normalizeText(value);
  if (!cleaned) return "Sin fecha";
  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) return cleaned;
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function reasonLabel(reason) {
  const cleaned = normalizeText(reason).toLowerCase();
  return REVISION_REASON_LABELS[cleaned] || normalizeText(reason) || "Cambio registrado";
}

function errorMessage(error) {
  const code = error?.payload?.code || error?.code;
  const message = String(error?.payload?.message || error?.message || "").trim();

  if (code === "backend_not_configured") return "El backend no esta configurado para esta sesion.";
  if (code === "UNAUTHENTICATED") return "Sesion expirada. Vuelve a iniciar sesion.";
  if (code === "FORBIDDEN") return "No tienes permiso para consultar registros.";
  if (code === "NOT_FOUND") return "El registro solicitado ya no existe.";
  if (message && message !== "request_failed") return message;
  return "No se pudo completar la consulta de registros.";
}

function buildAreaOptions(structure, campusFilter) {
  const campuses = Array.isArray(structure?.campuses) ? structure.campuses : [];
  const entities = Array.isArray(structure?.entities) ? structure.entities : [];
  const campus = campusFilter && campusFilter !== "all"
    ? campuses.find((item) => item.code === campusFilter)
    : null;

  return entities
    .filter((entity) => entity.type !== "building")
    .filter((entity) => entity.status !== "inactive")
    .filter((entity) => !campus || entity.campusId === campus.id)
    .map((entity) => ({ value: entity.code, label: `${entity.name} (${entity.code})` }));
}

function buildCampusOptions(structure) {
  return (Array.isArray(structure?.campuses) ? structure.campuses : [])
    .filter((campus) => campus.status !== "inactive")
    .map((campus) => ({ value: campus.code, label: `${campus.name} (${campus.code})` }));
}

function matchesSearch(record, query) {
  if (!query) return true;
  const haystack = [
    record.area,
    record.areaCode,
    record.campusCode,
    record.activity,
    record.activityText,
    record.category,
    record.scope,
    record.source,
    record.by,
    record.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sourceFilterMatches(record, value) {
  if (!value || value === "all") return true;
  return normalizeText(record.source).toLowerCase().includes(value.toLowerCase());
}

export default function RecordsPage() {
  const [loading, setLoading] = React.useState(true);
  const [records, setRecords] = React.useState([]);
  const [structure, setStructure] = React.useState({ campuses: [], entities: [] });
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({
    category: "all",
    source: "all",
    status: "all",
    campus: "all",
    area: "all",
    evidence: "all",
  });
  const [selected, setSelected] = React.useState(null);
  const [revisions, setRevisions] = React.useState([]);
  const [revisionsLoading, setRevisionsLoading] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [notice, setNotice] = React.useState(EMPTY_NOTICE);
  const [evidencePreview, setEvidencePreview] = React.useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setNotice(EMPTY_NOTICE);
    try {
      const [recordItems, orgStructure] = await Promise.all([
        fetchEmissionRecords(),
        fetchOrgStructure(),
      ]);
      setRecords(Array.isArray(recordItems) ? recordItems : []);
      setStructure({
        campuses: Array.isArray(orgStructure?.campuses) ? orgStructure.campuses : [],
        entities: Array.isArray(orgStructure?.entities) ? orgStructure.entities : [],
      });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDetail = React.useCallback(async (recordId) => {
    if (!recordId) return;
    setDetailLoading(true);
    setRevisionsLoading(true);
    try {
      const [detail, revisionItems] = await Promise.all([
        fetchEmissionRecord(recordId).catch(() => null),
        fetchEmissionRecordRevisions(recordId).catch(() => []),
      ]);
      if (detail) {
        setSelected((current) => (current?.id === recordId ? { ...current, ...detail } : current));
      }
      setRevisions(Array.isArray(revisionItems) ? revisionItems : []);
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error) });
      setRevisions([]);
    } finally {
      setDetailLoading(false);
      setRevisionsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!selected?.id) {
      setRevisions([]);
      return;
    }
    loadDetail(selected.id);
  }, [selected?.id, loadDetail]);

  const filtered = React.useMemo(() => {
    const query = search.trim();
    return records.filter((record) => {
      if (filters.category !== "all" && record.category !== filters.category) return false;
      if (!sourceFilterMatches(record, filters.source)) return false;
      if (filters.status !== "all" && record.status !== filters.status) return false;
      if (filters.campus !== "all" && normalizeText(record.campusCode).toUpperCase() !== filters.campus.toUpperCase()) return false;
      if (filters.area !== "all" && normalizeText(record.areaCode).toUpperCase() !== filters.area.toUpperCase()) return false;
      if (filters.evidence === "yes" && !record.hasEvidence) return false;
      if (filters.evidence === "no" && record.hasEvidence) return false;
      if (!matchesSearch(record, query)) return false;
      return true;
    });
  }, [records, filters, search]);

  const stats = React.useMemo(() => {
    const total = records.length;
    const real = records.filter((record) => record.status === "real").length;
    const estimated = records.filter((record) => record.status === "est").length;
    const withEvidence = records.filter((record) => record.hasEvidence).length;
    const totalEmissions = records.reduce((sum, record) => sum + (Number(record.co2e_kg) || 0), 0);
    return { total, real, estimated, withEvidence, totalEmissions };
  }, [records]);

  const campusOptions = React.useMemo(() => buildCampusOptions(structure), [structure]);
  const areaOptions = React.useMemo(() => buildAreaOptions(structure, filters.campus), [structure, filters.campus]);
  const categoryOptions = React.useMemo(() => {
    const present = new Set(records.map((record) => record.category).filter(Boolean));
    return Object.entries(CATEGORY_LABELS)
      .filter(([key]) => present.has(key))
      .map(([key, label]) => ({ value: key, label }));
  }, [records]);

  const columns = [
    {
      key: "dateISO",
      label: "Fecha",
      width: 130,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 700 }}>{formatDate(value)}</div>
          <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>{value}</div>
          <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 3 }}>
            {SCOPE_LABELS[row.scope] || row.scope || "Scope"}
          </div>
        </div>
      ),
    },
    {
      key: "area",
      label: "Area",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value || "Sin area"}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <InlineChip icon={Building2} label={row.campusCode || "Sin campus"} />
            <InlineChip icon={MapPin} label={row.areaCode || "Sin codigo"} />
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Categoria",
      width: 160,
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{CATEGORY_LABELS[value] || value || "Sin categoria"}</div>
          <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
            {row.activity || "Sin actividad"}
          </div>
        </div>
      ),
    },
    {
      key: "value",
      label: "Consumo",
      mono: true,
      align: "right",
      width: 150,
      render: (value, row) => (
        <span>
          <strong>{formatNumber(value, 2)}</strong>{" "}
          <span style={{ opacity: 0.6 }}>{row.unit || ""}</span>
        </span>
      ),
    },
    {
      key: "co2e_kg",
      label: "Emisiones",
      mono: true,
      align: "right",
      width: 150,
      render: (value) => (
        <span>
          <strong>{formatNumber(value, 2)}</strong>{" "}
          <span style={{ opacity: 0.6 }}>kgCO2e</span>
        </span>
      ),
    },
    {
      key: "source",
      label: "Origen",
      width: 130,
      render: (value) => (
        <span style={{
          fontFamily: fb,
          fontSize: 11.5,
          fontWeight: 600,
          padding: "3px 9px",
          borderRadius: 12,
          background: "rgba(37,99,235,.10)",
          color: "var(--eco-info, #2563EB)",
          display: "inline-block",
        }}>
          {value || "Sin origen"}
        </span>
      ),
    },
    {
      key: "hasEvidence",
      label: "Ev.",
      align: "center",
      width: 60,
      render: (_, row) => (
        row.evidenceFiles?.length || row.hasEvidence ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: fm, fontSize: 11.5, color: "var(--eco-info, #2563EB)" }}>
            <Paperclip size={11} /> {row.evidenceFiles?.length || 1}
          </span>
        ) : (
          <span style={{ opacity: 0.3 }}>--</span>
        )
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: 130,
      render: (value) => {
        const meta = STATUS_META[value] || STATUS_META.real;
        return <AdminStatusBadge variant={meta.variant} label={meta.label} />;
      },
    },
  ];

  if (loading) return <AdminLoadingScreen />;

  return (
    <div>
      <AdminPageHeader
        icon={Database}
        title="Gestion de registros"
        subtitle="Consulta del repositorio central de registros de consumo y emisiones para la organizacion."
        breadcrumb={["Operacion", "Registros"]}
        actions={
          <button type="button" onClick={loadData} style={secondaryButtonStyle}>
            <RefreshCw size={13} /> Actualizar
          </button>
        }
      />

      {notice.message ? (
        <Notice type={notice.type} message={notice.message} onClose={() => setNotice(EMPTY_NOTICE)} />
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <MiniStat label="Total" value={formatInteger(stats.total)} color="#64748B" />
        <MiniStat label="Reales" value={formatInteger(stats.real)} color="#16A34A" />
        <MiniStat label="Estimados" value={formatInteger(stats.estimated)} color="#CA8A04" />
        <MiniStat label="Con evidencia" value={formatInteger(stats.withEvidence)} color="#2563EB" />
        <MiniStat
          label="Emisiones acumuladas"
          value={`${formatNumber(stats.totalEmissions, 2)} kgCO2e`}
          color="#7C3AED"
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por area, actividad, codigo o nota..."
          filters={[
            { key: "category", label: "Categoria", options: categoryOptions },
            { key: "source", label: "Origen", options: SOURCE_OPTIONS },
            { key: "status", label: "Tipo", options: [
              { value: "real", label: "Real" },
              { value: "est", label: "Estimacion" },
            ] },
            { key: "campus", label: "Campus", options: campusOptions },
            { key: "area", label: "Area", options: areaOptions },
            { key: "evidence", label: "Evidencia", options: [
              { value: "yes", label: "Con evidencia" },
              { value: "no", label: "Sin evidencia" },
            ] },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) =>
            setFilters((prev) => {
              const next = { ...prev, [key]: value };
              if (key === "campus") next.area = "all";
              return next;
            })
          }
          onClear={() => {
            setSearch("");
            setFilters({
              category: "all",
              source: "all",
              status: "all",
              campus: "all",
              area: "all",
              evidence: "all",
            });
          }}
        />
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={(row) => setSelected(row)}
        emptyMessage={
          records.length === 0
            ? "Aun no se han capturado registros en el sistema."
            : "No hay registros que coincidan con los filtros."
        }
      />

      <AdminEntityDrawer
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setRevisions([]);
        }}
        title={selected ? `${CATEGORY_LABELS[selected.category] || selected.category || "Registro"} - ${selected.area || "Sin area"}` : ""}
        subtitle={selected ? `${formatDate(selected.dateISO)} - ${selected.id?.toUpperCase()}` : ""}
        badge={selected && (
          <AdminStatusBadge
            variant={(STATUS_META[selected.status] || STATUS_META.real).variant}
            label={(STATUS_META[selected.status] || STATUS_META.real).label}
          />
        )}
        width={560}
      >
        {selected && (
          <>
            {detailLoading && (
              <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                Sincronizando detalle del registro...
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Consumo" mono>
                {formatNumber(selected.value, 2)} {selected.unit || ""}
              </DrawerField>
              <DrawerField label="Emisiones" mono>
                {formatNumber(selected.co2e_kg, 2)} kgCO2e
              </DrawerField>
              <DrawerField label="Equivalente" mono>
                {formatNumber(selected.co2e_t, 4)} tCO2e
              </DrawerField>
              <DrawerField label="Factor aplicado" mono>
                {formatNumber(selected.factor, 6)} kgCO2e/{selected.unit || ""}
              </DrawerField>
              <DrawerField label="Alcance">
                {SCOPE_LABELS[selected.scope] || selected.scope || "--"}
              </DrawerField>
              <DrawerField label="Categoria">
                {CATEGORY_LABELS[selected.category] || selected.category || "--"}
              </DrawerField>
              <DrawerField label="Metrica" mono>{selected.metric || "--"}</DrawerField>
              <DrawerField label="Origen">{selected.source || "--"}</DrawerField>
              <DrawerField label="Capturado por">{selected.by || "--"}</DrawerField>
              <DrawerField label="Capturado el" mono>
                {formatDateTime(selected.createdAt)}
              </DrawerField>
              <DrawerField label="Campus" mono>{selected.campusCode || "--"}</DrawerField>
              <DrawerField label="Area" mono>
                {selected.areaCode ? `${selected.areaCode}` : "--"}
              </DrawerField>
              <DrawerField label="Identificador" mono>{selected.id || "--"}</DrawerField>
              <DrawerField label="Factor ID" mono>{selected.factorId || "--"}</DrawerField>
            </div>

            {selected.activity || selected.activityText ? (
              <DrawerField label="Actividad">
                {selected.activityText || selected.activity}
              </DrawerField>
            ) : null}

            {selected.note ? (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 14px",
                background: "rgba(234,179,8,.08)",
                border: "1px solid rgba(234,179,8,.20)",
                borderRadius: 10,
                color: "var(--eco-warning, #CA8A04)",
                fontFamily: fb, fontSize: 12.5,
              }}>
                <AlertTriangle size={15} />
                <span>{selected.note}</span>
              </div>
            ) : null}

            <div>
              <SectionTitle icon={Paperclip} label="Evidencia" />
              {(selected.evidenceFiles || []).length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin evidencia adjunta.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selected.evidenceFiles.map((file) => (
                    <div key={file.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 12px",
                      background: "var(--eco-card-muted, #F8FAFC)",
                      border: "1px solid var(--eco-border, #E2E8F0)",
                      borderRadius: 8,
                    }}>
                      <FileText size={14} color="var(--eco-info, #2563EB)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600 }}>
                          {file.fileName || file.name || "archivo"}
                        </div>
                        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                          {file.mimeType || "archivo"}
                          {file.sizeBytes ? ` - ${formatBytes(file.sizeBytes)}` : ""}
                        </div>
                      </div>
                      {file.url ? (
                        <button
                          type="button"
                          onClick={() => setEvidencePreview(file)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "5px 10px", borderRadius: 7,
                            background: "rgba(37,99,235,.10)",
                            color: "var(--eco-info, #2563EB)",
                            fontFamily: fb, fontSize: 11, fontWeight: 700,
                            border: "none", cursor: "pointer",
                          }}
                        >
                          <Download size={12} /> Abrir
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionTitle icon={History} label="Trazabilidad" />
              {revisionsLoading ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                  Cargando trazabilidad...
                </div>
              ) : revisions.length === 0 ? (
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", fontStyle: "italic" }}>
                  Sin eventos registrados para este registro.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
                  {revisions.map((revision) => (
                    <div key={revision.id} style={{ display: "flex", gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: "var(--eco-primary-500, #22C55E)",
                        marginTop: 6, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontFamily: fb, fontSize: 12.5, color: "var(--eco-text)" }}>
                          <strong>{revision.changedByName || revision.changedByEmail || "Sistema"}</strong>
                          {" "}
                          {reasonLabel(revision.changeReason).toLowerCase()}
                        </div>
                        <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
                          v{revision.revisionNo} - {formatDateTime(revision.changedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </AdminEntityDrawer>

      <EvidencePreviewModal
        file={evidencePreview}
        onClose={() => setEvidencePreview(null)}
      />
    </div>
  );
}

function EvidencePreviewModal({ file, onClose }) {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  React.useEffect(() => {
    if (!file) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [file, onClose]);

  const fileUrl = file?.url || "";
  const mimeType = String(file?.mimeType || "").toLowerCase();
  const isImage = mimeType.startsWith("image/");

  React.useEffect(() => {
    if (!file || !isImage || !fileUrl) {
      setBlobUrl(null);
      setLoading(false);
      setErrorMsg("");
      return undefined;
    }

    let revoked = false;
    let createdUrl = null;
    setLoading(true);
    setErrorMsg("");

    const session = getSession();
    const headers = session?.token ? { Authorization: `Bearer ${session.token}` } : {};

    fetch(fileUrl, { headers })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`http_${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        setLoading(false);
      })
      .catch(() => {
        if (revoked) return;
        setErrorMsg("No se pudo cargar la imagen.");
        setLoading(false);
      });

    return () => {
      revoked = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [file, fileUrl, isImage]);

  if (!file) return null;

  const fileName = file.fileName || file.name || "archivo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${fileName}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(15, 23, 42, .65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "adminFadeIn .15s ease-out",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: "var(--eco-card, #fff)",
          color: "var(--eco-text, #1E293B)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0, 0, 0, .35)",
          maxWidth: "min(960px, 100%)",
          maxHeight: "calc(100vh - 48px)",
          width: isImage ? "auto" : "min(520px, 100%)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid var(--eco-border, #E2E8F0)",
            background: "var(--eco-card, #fff)",
          }}
        >
          <FileText size={16} color="var(--eco-info, #2563EB)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: fd,
                fontSize: 14,
                fontWeight: 700,
                color: "var(--eco-text, #1E293B)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={fileName}
            >
              {fileName}
            </div>
            <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft, #64748B)", marginTop: 2 }}>
              {mimeType || "archivo"}
              {file.sizeBytes ? ` - ${formatBytes(file.sizeBytes)}` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--eco-border, #E2E8F0)",
              background: "transparent",
              color: "var(--eco-text-soft, #94A3B8)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--eco-card-muted, #F1F5F9)",
            padding: isImage ? 18 : 28,
            overflow: "auto",
          }}
        >
          {isImage ? (
            loading ? (
              <div style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, #64748B)" }}>
                Cargando imagen...
              </div>
            ) : errorMsg ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "var(--eco-danger, #DC2626)" }}>
                <AlertTriangle size={32} />
                <div style={{ fontFamily: fb, fontSize: 13 }}>{errorMsg}</div>
              </div>
            ) : blobUrl ? (
              <img
                src={blobUrl}
                alt={fileName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "min(72vh, 720px)",
                  objectFit: "contain",
                  borderRadius: 8,
                  background: "var(--eco-card, #fff)",
                }}
              />
            ) : null
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                textAlign: "center",
                color: "var(--eco-text, #1E293B)",
              }}
            >
              <FileText size={48} color="var(--eco-info, #2563EB)" />
              <div style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-text-soft, #64748B)" }}>
                Este tipo de archivo no se puede previsualizar aqui.
              </div>
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(37,99,235,.12)",
                    color: "var(--eco-info, #2563EB)",
                    fontFamily: fb,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <Download size={14} /> Abrir en otra pestana
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{
      padding: "14px 18px",
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border, #E2E8F0)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: fd, fontSize: 22, fontWeight: 800, color: "var(--eco-text)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      fontFamily: fd, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
      letterSpacing: ".05em", color: "var(--eco-text-soft)",
    }}>
      <Icon size={13} /> {label}
    </div>
  );
}

function InlineChip({ icon: Icon, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      background: "var(--eco-card-muted, #F8FAFC)",
      color: "var(--eco-text-soft, #64748B)",
      fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function Notice({ type, message, onClose }) {
  const isError = type === "error";
  return (
    <div style={{
      marginBottom: 14, padding: "10px 12px", borderRadius: 10,
      border: `1px solid ${isError ? "rgba(220,38,38,.25)" : "rgba(34,197,94,.25)"}`,
      background: isError ? "rgba(220,38,38,.07)" : "rgba(34,197,94,.07)",
      display: "flex", justifyContent: "space-between", gap: 12,
    }}>
      <span style={{ fontFamily: fb, fontSize: 13, color: isError ? "#991B1B" : "#166534" }}>
        {message}
      </span>
      <button type="button" onClick={onClose} style={{
        border: "none", background: "transparent", cursor: "pointer",
        color: "inherit", fontWeight: 700,
      }}>
        Cerrar
      </button>
    </div>
  );
}

const secondaryButtonStyle = {
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid var(--eco-border, #E2E8F0)",
  background: "var(--eco-card, #fff)",
  color: "var(--eco-text, #1E293B)",
  fontFamily: fb,
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
};
