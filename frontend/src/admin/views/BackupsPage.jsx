import React from "react";
import {
  HardDrive, DatabaseBackup, RotateCcw, Trash2, Plus, Download, Upload,
  Activity, Server, Database, Zap, Cpu, Cloud, AlertTriangle, CheckCircle2,
  PowerOff, Power, RefreshCw, Settings, ShieldOff, ShieldCheck,
  FileText, LogOut, FileQuestion, Bell, Clock, Lock,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminTabs from "../components/AdminTabs";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import {
  AdminFormSection, AdminToggleField, AdminSelectField, AdminNumberField, AdminTextField,
} from "../components/AdminFormSection";
import {
  backupList, backupSchedule, systemResources, cleanupTasks, maintenanceStatus,
} from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fd = "var(--eco-font-display)";
const fm = "var(--eco-font-mono)";

const CLEANUP_ICON = { Trash2, LogOut, FileText, FileQuestion, Zap, Bell };

const STATUS_LABEL = {
  online:  "En línea",
  warning: "Advertencia",
  offline: "Sin conexión",
};

const STATUS_VARIANT = {
  online: "success", warning: "warning", offline: "error",
};

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDuration(sec) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function BackupsPage() {
  const [tab, setTab] = React.useState("backups");
  const [backups, setBackups] = React.useState(backupList);
  const [schedule, setSchedule] = React.useState(backupSchedule);
  const [scheduleDirty, setScheduleDirty] = React.useState(false);
  const [creatingBackup, setCreatingBackup] = React.useState(false);
  const [confirm, setConfirm] = React.useState(null); // { title, description, kind, onConfirm }
  const [maintenance, setMaintenance] = React.useState(maintenanceStatus);

  function update(key, val) {
    setSchedule(p => ({ ...p, [key]: val }));
    setScheduleDirty(true);
  }

  function handleCreateBackup() {
    setCreatingBackup(true);
    setTimeout(() => {
      const now = new Date();
      const id = "bk-" + now.toISOString().slice(0, 10) + "-m";
      const newBackup = {
        id,
        name: `backup_manual_${now.toISOString().slice(0, 10)}.tar.gz`,
        type: "manual",
        size: "415 MB",
        createdAt: now.toISOString(),
        durationSec: 187,
        status: "completed",
        retention: "90d",
        checksumOk: true,
        note: "Respaldo manual",
      };
      setBackups(p => [newBackup, ...p]);
      setCreatingBackup(false);
    }, 1400);
  }

  function deleteBackup(id) {
    setConfirm({
      title: "Eliminar respaldo",
      description: "Esta acción es permanente y no se puede deshacer. ¿Deseas continuar?",
      kind: "danger",
      onConfirm: () => {
        setBackups(p => p.filter(b => b.id !== id));
        setConfirm(null);
      },
    });
  }

  function restoreBackup(id) {
    const b = backups.find(x => x.id === id);
    setConfirm({
      title: "Restaurar respaldo",
      description: `¿Restaurar el sistema desde "${b?.name}"? El sistema entrará en modo mantenimiento durante el proceso.`,
      kind: "warning",
      onConfirm: () => {
        setConfirm(null);
        alert("Restauración programada. (mock)");
      },
    });
  }

  // ── Backup table ────────────────────────────────────────────────
  const backupColumns = [
    { key: "name", label: "Archivo", render: (v, row) => (
      <div>
        <div style={{ fontFamily: fm, fontSize: 12, fontWeight: 600, color: "var(--eco-text)" }}>{v}</div>
        {row.note && (
          <div style={{ fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>{row.note}</div>
        )}
      </div>
    ) },
    { key: "type", label: "Tipo", width: 100, render: v => (
      <AdminStatusBadge
        variant={v === "manual" ? "info" : "neutral"}
        label={v === "manual" ? "Manual" : "Automático"}
      />
    ) },
    { key: "size", label: "Tamaño", mono: true, width: 90, align: "right" },
    { key: "durationSec", label: "Duración", mono: true, width: 90, render: v => fmtDuration(v) },
    { key: "createdAt", label: "Fecha", mono: true, width: 160, render: v => fmtDate(v) },
    { key: "retention", label: "Retención", width: 100, render: v => {
      const map = { "30d": "30 días", "90d": "90 días", "perm": "Permanente", "—": "—" };
      return <span style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)" }}>{map[v] || v}</span>;
    } },
    { key: "status", label: "Estado", width: 110, render: v => (
      <AdminStatusBadge
        variant={v === "completed" ? "success" : v === "failed" ? "error" : "warning"}
        label={v === "completed" ? "Completado" : v === "failed" ? "Fallido" : "En proceso"}
      />
    ) },
    { key: "_actions", label: "", width: 130, render: (_, row) => (
      <div style={{ display: "flex", gap: 4 }}>
        <button title="Descargar" disabled={row.status !== "completed"} style={{
          ...iconBtn,
          opacity: row.status === "completed" ? 1 : .35,
          cursor: row.status === "completed" ? "pointer" : "not-allowed",
        }}><Download size={14} /></button>
        <button onClick={() => restoreBackup(row.id)} title="Restaurar" disabled={row.status !== "completed"} style={{
          ...iconBtn,
          opacity: row.status === "completed" ? 1 : .35,
          cursor: row.status === "completed" ? "pointer" : "not-allowed",
        }}><RotateCcw size={14} /></button>
        <button onClick={() => deleteBackup(row.id)} title="Eliminar" style={{
          ...iconBtn,
          color: "var(--eco-danger, #DC2626)",
          borderColor: "rgba(239,68,68,.18)",
        }}><Trash2 size={14} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={HardDrive}
        title="Respaldos y mantenimiento"
        subtitle="Protección, restauración y salud del sistema."
        breadcrumb={["Soporte", "Respaldos"]}
        actions={
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            style={{
              ...primaryBtn,
              background: creatingBackup ? "var(--eco-gray-300)" : "var(--eco-primary-500, #22C55E)",
              cursor: creatingBackup ? "wait" : "pointer",
            }}
          >
            <DatabaseBackup size={14} />
            {creatingBackup ? "Creando…" : "Nuevo respaldo"}
          </button>
        }
      />

      <AdminTabs
        tabs={[
          { id: "backups",     label: "Respaldos",          count: backups.length },
          { id: "schedule",    label: "Programación" },
          { id: "health",      label: "Estado del sistema" },
          { id: "cleanup",     label: "Limpieza",           count: cleanupTasks.length },
          { id: "maintenance", label: "Mantenimiento" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ─── Backups list ─────────────────────────────────────── */}
      {tab === "backups" && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12, marginBottom: 16,
          }}>
            <SummaryCard
              icon={DatabaseBackup}
              label="Último respaldo"
              value={schedule.lastBackupAt ? fmtDate(schedule.lastBackupAt).split(",")[0] : "—"}
              subtitle={schedule.lastBackupAt ? new Date(schedule.lastBackupAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : ""}
              accent="#22C55E"
            />
            <SummaryCard
              icon={Clock}
              label="Próximo programado"
              value={schedule.nextBackupAt ? fmtDate(schedule.nextBackupAt).split(",")[0] : "—"}
              subtitle="03:00 a.m."
              accent="#2563EB"
            />
            <SummaryCard
              icon={HardDrive}
              label="Total respaldos"
              value={backups.length}
              subtitle={backups.filter(b => b.status === "completed").length + " válidos"}
              accent="#7C3AED"
            />
            <SummaryCard
              icon={Cloud}
              label="Espacio usado"
              value="3.2 GB"
              subtitle={schedule.destination?.split("/").pop() || "Local"}
              accent="#0891B2"
            />
          </div>
          <AdminDataTable columns={backupColumns} data={backups} sortable />
        </>
      )}

      {/* ─── Schedule ─────────────────────────────────────────── */}
      {tab === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AdminFormSection
            title="Respaldos automáticos"
            description="Configura la frecuencia, retención y destino de los respaldos del sistema."
            columns={2}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Respaldos automáticos activos"
                description="Cuando está activo, el sistema crea respaldos completos según la programación definida."
                checked={schedule.enabled}
                onChange={v => update("enabled", v)}
              />
            </div>
            <AdminSelectField
              label="Frecuencia"
              value={schedule.frequency}
              onChange={v => update("frequency", v)}
              options={[
                { value: "daily",   label: "Diaria" },
                { value: "weekly",  label: "Semanal" },
                { value: "monthly", label: "Mensual" },
              ]}
            />
            <AdminTextField
              label="Hora de ejecución"
              type="time"
              value={schedule.hour}
              onChange={v => update("hour", v)}
              hint="Hora local del servidor (CST)."
            />
            <AdminNumberField
              label="Retención"
              value={schedule.retentionDays}
              onChange={v => update("retentionDays", v)}
              min={7} max={365} step={1}
              unit="días"
              hint="Los respaldos antiguos se eliminan automáticamente."
            />
            <AdminTextField
              label="Destino"
              value={schedule.destination}
              onChange={v => update("destination", v)}
              hint="Bucket S3, ruta local o servicio remoto."
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Cifrar respaldos"
                description="Los archivos se cifran con AES-256 antes de subirse."
                checked={schedule.encrypted}
                onChange={v => update("encrypted", v)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Notificar fallos por correo"
                description="Avisar al administrador si un respaldo automático falla."
                checked={schedule.notifyOnFail}
                onChange={v => update("notifyOnFail", v)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <AdminToggleField
                label="Notificar respaldos exitosos"
                description="Recibe confirmación al finalizar cada respaldo."
                checked={schedule.notifyOnSuccess}
                onChange={v => update("notifyOnSuccess", v)}
              />
            </div>
          </AdminFormSection>

          {scheduleDirty && (
            <div style={{
              display: "flex", justifyContent: "flex-end", gap: 8,
            }}>
              <button onClick={() => { setSchedule({ ...backupSchedule }); setScheduleDirty(false); }} style={secondaryBtn}>
                Restaurar
              </button>
              <button onClick={() => setScheduleDirty(false)} style={primaryBtn}>
                <CheckCircle2 size={13} /> Guardar cambios
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Health ───────────────────────────────────────────── */}
      {tab === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Storage */}
          <SectionCard title="Almacenamiento" icon={HardDrive}>
            <StorageBar
              total={systemResources.storage.totalGB}
              segments={[
                { label: "Respaldos",   value: systemResources.storage.backupsGB,   color: "#22C55E" },
                { label: "Evidencias",  value: systemResources.storage.evidencesGB, color: "#2563EB" },
                { label: "Base de datos",value: systemResources.storage.databaseGB, color: "#7C3AED" },
                { label: "Logs",        value: systemResources.storage.logsGB,      color: "#CA8A04" },
                { label: "Otros",       value: systemResources.storage.otherGB,     color: "#94A3B8" },
              ]}
            />
          </SectionCard>

          {/* Database */}
          <SectionCard title="Base de datos" icon={Database}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}>
              <Metric label="Estado" value={
                <AdminStatusBadge variant={STATUS_VARIANT[systemResources.database.status]} label={STATUS_LABEL[systemResources.database.status]} />
              } />
              <Metric label="Tamaño" value={systemResources.database.size} mono />
              <Metric label="Conexiones" value={`${systemResources.database.connections} / ${systemResources.database.maxConnections}`} mono />
              <Metric label="Uptime" value={systemResources.database.uptime} mono />
              <Metric label="Último vacuum" value={fmtDate(systemResources.database.lastVacuum)} />
              <Metric label="Consultas lentas" value={systemResources.database.slowQueries} mono />
            </div>
          </SectionCard>

          {/* Server */}
          <SectionCard title="Servidor de aplicación" icon={Server}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}>
              <Metric label="Estado" value={
                <AdminStatusBadge variant={STATUS_VARIANT[systemResources.server.status]} label={STATUS_LABEL[systemResources.server.status]} />
              } />
              <Metric label="CPU" value={`${systemResources.server.cpu} %`} bar={systemResources.server.cpu} />
              <Metric label="Memoria" value={`${systemResources.server.ram} %`} bar={systemResources.server.ram} barColor={systemResources.server.ram > 80 ? "#DC2626" : "#22C55E"} />
              <Metric label="Disco I/O" value={`${systemResources.server.diskIo} %`} bar={systemResources.server.diskIo} />
              <Metric label="Uptime" value={systemResources.server.uptime} mono />
              <Metric label="Versión API" value={systemResources.server.apiVersion} mono />
            </div>
          </SectionCard>

          {/* Services */}
          <SectionCard title="Servicios" icon={Activity}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}>
              {systemResources.services.map(svc => (
                <div key={svc.id} style={{
                  padding: "12px 14px", borderRadius: 10,
                  border: "1px solid var(--eco-border)",
                  background: "var(--eco-card-muted, #F8FAFC)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: svc.status === "online"
                      ? "var(--eco-success, #16A34A)"
                      : svc.status === "warning"
                        ? "var(--eco-warning, #CA8A04)"
                        : "var(--eco-danger, #DC2626)",
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fb, fontSize: 12.5, fontWeight: 600, color: "var(--eco-text)" }}>
                      {svc.label}
                    </div>
                    <div style={{ fontFamily: fm, fontSize: 10.5, color: "var(--eco-text-soft)" }}>
                      Uptime: {svc.uptime}
                    </div>
                  </div>
                  {svc.canRestart && (
                    <button title="Reiniciar servicio" style={iconBtn}>
                      <RefreshCw size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── Cleanup ──────────────────────────────────────────── */}
      {tab === "cleanup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{
            background: "rgba(202,138,4,.06)",
            border: "1px solid rgba(202,138,4,.18)",
            borderRadius: 12, padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 10,
            fontFamily: fb, fontSize: 12.5,
            color: "var(--eco-text)",
          }}>
            <AlertTriangle size={16} color="var(--eco-warning, #CA8A04)" />
            <div>
              <strong>Limpieza segura.</strong>{" "}
              <span style={{ color: "var(--eco-text-soft)" }}>
                Las acciones de esta sección eliminan datos no esenciales. Se recomienda crear un respaldo antes de ejecutarlas.
              </span>
            </div>
          </div>

          {cleanupTasks.map(task => {
            const Icon = CLEANUP_ICON[task.icon] || Trash2;
            return (
              <div key={task.id} style={{
                background: "var(--eco-card)",
                border: "1px solid var(--eco-border)",
                borderRadius: 12, padding: "14px 18px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto auto auto",
                alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: "rgba(34,197,94,.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={17} color="var(--eco-primary-500, #22C55E)" />
                </div>
                <div>
                  <div style={{ fontFamily: fb, fontSize: 13.5, fontWeight: 600, color: "var(--eco-text)" }}>
                    {task.label}
                  </div>
                  <div style={{ fontFamily: fb, fontSize: 11.5, color: "var(--eco-text-soft)", marginTop: 2 }}>
                    {task.description}
                  </div>
                </div>
                <div style={{
                  fontFamily: fm, fontSize: 13, fontWeight: 700,
                  color: "var(--eco-text)",
                }}>
                  {task.size}
                </div>
                <div style={{
                  fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)",
                  whiteSpace: "nowrap",
                }}>
                  Última: {fmtDate(task.lastRun).split(",")[0]}
                </div>
                <button
                  onClick={() => setConfirm({
                    title: `Limpiar: ${task.label}`,
                    description: `Se liberará aproximadamente ${task.size}. Esta acción es irreversible.`,
                    kind: "warning",
                    onConfirm: () => setConfirm(null),
                  })}
                  style={secondaryBtn}
                >
                  <Trash2 size={13} /> Limpiar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Maintenance ─────────────────────────────────────── */}
      {tab === "maintenance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard title="Modo mantenimiento" icon={maintenance.maintenanceMode ? ShieldOff : ShieldCheck}>
            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: maintenance.maintenanceMode
                ? "rgba(239,68,68,.06)"
                : "rgba(34,197,94,.06)",
              border: `1px solid ${maintenance.maintenanceMode ? "rgba(239,68,68,.18)" : "rgba(34,197,94,.18)"}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div>
                <div style={{
                  fontFamily: fd, fontSize: 14, fontWeight: 700,
                  color: maintenance.maintenanceMode ? "var(--eco-danger, #DC2626)" : "var(--eco-success, #16A34A)",
                }}>
                  {maintenance.maintenanceMode ? "Sistema en mantenimiento" : "Sistema operativo"}
                </div>
                <div style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)", marginTop: 3 }}>
                  {maintenance.maintenanceMode
                    ? "Los usuarios no administradores ven una pantalla de mantenimiento."
                    : "Todos los usuarios pueden acceder con normalidad al sistema."}
                </div>
              </div>
              <button
                onClick={() => setMaintenance(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))}
                style={maintenance.maintenanceMode ? primaryBtn : { ...secondaryBtn, color: "var(--eco-warning, #CA8A04)", borderColor: "rgba(202,138,4,.3)" }}
              >
                {maintenance.maintenanceMode ? (
                  <><Power size={13} /> Reactivar sistema</>
                ) : (
                  <><PowerOff size={13} /> Activar mantenimiento</>
                )}
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Reinicio controlado de servicios" icon={RefreshCw}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {systemResources.services.filter(s => s.canRestart).map(svc => (
                <div key={svc.id} style={{
                  padding: "12px 14px", borderRadius: 10,
                  border: "1px solid var(--eco-border)",
                  background: "var(--eco-card)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Settings size={14} color="var(--eco-text-soft)" />
                  <div style={{ flex: 1, fontFamily: fb, fontSize: 12.5, fontWeight: 600 }}>{svc.label}</div>
                  <button
                    onClick={() => setConfirm({
                      title: `Reiniciar ${svc.label}`,
                      description: "El servicio estará indisponible unos segundos. ¿Continuar?",
                      kind: "warning",
                      onConfirm: () => setConfirm(null),
                    })}
                    style={iconBtn}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Información del sistema" icon={Cpu}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <Metric label="Último reinicio" value={fmtDate(maintenance.lastReboot)} />
              <Metric label="Versión Node" value={systemResources.server.nodeVer} mono />
              <Metric label="Versión API" value={systemResources.server.apiVersion} mono />
              <Metric label="Actualizaciones pendientes" value={maintenance.pendingUpdates} mono />
            </div>
          </SectionCard>
        </div>
      )}

      <AdminConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.description}
        danger={confirm?.kind === "danger"}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children }) {
  return (
    <div style={{
      background: "var(--eco-card, #fff)",
      border: "1px solid var(--eco-border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid var(--eco-border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {Icon && <Icon size={15} color="var(--eco-primary-500, #22C55E)" />}
        <span style={{
          fontFamily: fb, fontSize: 13, fontWeight: 600,
          color: "var(--eco-text)",
          textTransform: "uppercase", letterSpacing: ".04em",
        }}>{title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, subtitle, accent }) {
  return (
    <div style={{
      background: "var(--eco-card)",
      border: "1px solid var(--eco-border)",
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: accent || "var(--eco-primary-500, #22C55E)",
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {Icon && (
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `${accent}15` || "rgba(34,197,94,.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={14} color={accent || "var(--eco-primary-500)"} />
          </div>
        )}
        <span style={{
          fontFamily: fb, fontSize: 11, fontWeight: 600,
          color: "var(--eco-text-soft)",
          textTransform: "uppercase", letterSpacing: ".05em",
        }}>{label}</span>
      </div>
      <div style={{ fontFamily: fm, fontSize: 18, fontWeight: 700, color: "var(--eco-text)" }}>{value}</div>
      {subtitle && (
        <div style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)", marginTop: 2 }}>{subtitle}</div>
      )}
    </div>
  );
}

function Metric({ label, value, mono, bar, barColor }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 9,
      background: "var(--eco-card-muted, #F8FAFC)",
      border: "1px solid var(--eco-border)",
    }}>
      <div style={{
        fontFamily: fb, fontSize: 10.5, fontWeight: 600,
        color: "var(--eco-text-soft)",
        textTransform: "uppercase", letterSpacing: ".05em",
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? fm : fb,
        fontSize: 14, fontWeight: 700,
        color: "var(--eco-text)", marginTop: 4,
      }}>{value}</div>
      {bar !== undefined && (
        <div style={{
          height: 4, borderRadius: 2,
          background: "var(--eco-border)",
          overflow: "hidden", marginTop: 6,
        }}>
          <div style={{
            width: `${bar}%`, height: "100%",
            background: barColor || "var(--eco-primary-500, #22C55E)",
          }} />
        </div>
      )}
    </div>
  );
}

function StorageBar({ total, segments }) {
  const used = segments.reduce((s, x) => s + x.value, 0);
  const free = total - used;
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 8,
      }}>
        <span style={{ fontFamily: fb, fontSize: 13, color: "var(--eco-text)" }}>
          <strong style={{ fontFamily: fm }}>{used} GB</strong>{" "}
          <span style={{ color: "var(--eco-text-soft)" }}>de {total} GB usados</span>
        </span>
        <span style={{
          fontFamily: fm, fontSize: 12, fontWeight: 600,
          color: used / total > 0.8 ? "var(--eco-danger, #DC2626)" : "var(--eco-text-soft)",
        }}>
          {Math.round((used / total) * 100)}%
        </span>
      </div>
      <div style={{
        height: 14, borderRadius: 7,
        background: "var(--eco-card-muted, #F1F5F9)",
        display: "flex", overflow: "hidden",
        border: "1px solid var(--eco-border)",
      }}>
        {segments.map(s => (
          <div
            key={s.label}
            title={`${s.label}: ${s.value} GB`}
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10,
      }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text)" }}>
              {s.label}
            </span>
            <span style={{ fontFamily: fm, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
              {s.value} GB
            </span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "transparent", border: "1px dashed var(--eco-border)" }} />
          <span style={{ fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>Libre</span>
          <span style={{ fontFamily: fm, fontSize: 11.5, color: "var(--eco-text-soft)" }}>
            {free} GB
          </span>
        </div>
      </div>
    </div>
  );
}

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

const iconBtn = {
  background: "transparent", border: "1px solid var(--eco-border)",
  color: "var(--eco-text-soft)", padding: 6, borderRadius: 6,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};
