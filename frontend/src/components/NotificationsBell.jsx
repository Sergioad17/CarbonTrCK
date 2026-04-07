import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Beaker,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Download,
  FilePlus2,
  FolderArchive,
  Leaf,
  Settings,
  AlertTriangle,
  Trash2,
  Upload,
} from "lucide-react";
import {
  archiveNotification,
  clearArchivedNotifications,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  subscribeNotifications,
} from "../api/notifications";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const BELL_CSS = `
@keyframes ctBellPop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes ctShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes ctPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes ctItemIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
`;

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "No leídas" },
  { id: "archived", label: "Archivadas" },
];

function getTypeMeta(type) {
  if (type === "record_created") return { icon: FilePlus2, color: "var(--eco-success)", bg: "var(--eco-success-bg)" };
  if (type === "record_imported") return { icon: Upload, color: "var(--eco-info)", bg: "var(--eco-info-bg)" };
  if (type === "export_done") return { icon: Download, color: "var(--eco-primary-600)", bg: "var(--eco-primary-50)" };
  if (type === "factor_updated") return { icon: Beaker, color: "var(--eco-secondary-600)", bg: "var(--eco-warning-bg)" };
  if (type === "goal_risk") return { icon: AlertTriangle, color: "var(--eco-warning)", bg: "var(--eco-warning-bg)" };
  return { icon: Leaf, color: "var(--eco-text-soft)", bg: "var(--eco-card-muted)" };
}

function formatRelativeTime(value) {
  const date = new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) return "Ahora";
  const diffSeconds = Math.round((time - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });
  const absSeconds = Math.abs(diffSeconds);
  if (absSeconds < 60) return "Ahora";
  if (absSeconds < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (absSeconds < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  return rtf.format(Math.round(diffSeconds / 86400), "day");
}

function getFiltered(items, filterId) {
  if (filterId === "unread") return items.filter((item) => item.status === "unread");
  if (filterId === "archived") return items.filter((item) => item.status === "archived");
  return items;
}

/* ─── Mini action button for notification items ─── */
function MiniAction({ icon: Icon, label, onClick, tone }) {
  const colors = {
    default: { bg: "var(--eco-card)", border: "var(--eco-border)", color: "var(--eco-text-soft)", hoverBg: "var(--eco-card-muted)", hoverBorder: "var(--eco-primary-200)", hoverColor: "var(--eco-primary-600)" },
    danger: { bg: "var(--eco-card)", border: "var(--eco-border)", color: "var(--eco-text-soft)", hoverBg: "var(--eco-danger-bg)", hoverBorder: "rgba(248,113,113,0.3)", hoverColor: "var(--eco-danger)" },
  }[tone || "default"];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 26,
        padding: "0 8px",
        borderRadius: "var(--eco-radius-full)",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.color,
        fontFamily: fb,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.hoverBg;
        e.currentTarget.style.borderColor = colors.hoverBorder;
        e.currentTarget.style.color = colors.hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bg;
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.color = colors.color;
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

/* ─── Loading skeleton for panel ─── */
function PanelSkeleton() {
  const sh = {
    background: "linear-gradient(90deg, var(--eco-border) 25%, var(--eco-surface) 50%, var(--eco-border) 75%)",
    backgroundSize: "200% 100%",
    animation: "ctShimmer 1.4s ease-in-out infinite",
    borderRadius: "var(--eco-radius-md)",
  };
  const sa = (delay) => ({ ...sh, animationDelay: `${delay}ms` });

  return (
    <div style={{ padding: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            padding: 12,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            borderBottom: i < 3 ? "1px solid var(--eco-border)" : "none",
          }}
        >
          <div style={{ ...sa(i * 40), width: 36, height: 36, borderRadius: "var(--eco-radius-md)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ ...sa(i * 40 + 10), width: 120, height: 14 }} />
              <div style={{ ...sa(i * 40 + 20), width: 40, height: 16, borderRadius: "var(--eco-radius-full)" }} />
            </div>
            <div style={{ ...sa(i * 40 + 30), width: "90%", height: 12, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ ...sa(i * 40 + 40), width: 50, height: 10 }} />
              <div style={{ ...sa(i * 40 + 50), width: 70, height: 10 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsBell({ onNavigate, onToast }) {
  const shellRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [items, setItems] = useState(() => fetchNotifications());
  const [hoveredId, setHoveredId] = useState(null);
  const [bellHovered, setBellHovered] = useState(false);
  const [panelReady, setPanelReady] = useState(false);

  useEffect(() => subscribeNotifications(setItems), []);

  useEffect(() => {
    if (!open) {
      setPanelReady(false);
      return undefined;
    }

    const timer = setTimeout(() => setPanelReady(true), 280);

    const handlePointerDown = (event) => {
      if (shellRef.current && !shellRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const unreadCount = useMemo(() => fetchUnreadNotificationsCount(), [items]);
  const filteredItems = useMemo(() => getFiltered(items, activeFilter), [items, activeFilter]);
  const archivedCount = useMemo(() => items.filter((item) => item.status === "archived").length, [items]);

  const filterCounts = useMemo(
    () => ({
      all: items.length,
      unread: unreadCount,
      archived: archivedCount,
    }),
    [items.length, unreadCount, archivedCount]
  );

  const handleToggle = () => setOpen((prev) => !prev);

  const handleItemClick = async (item) => {
    if (item.status === "unread") await markNotificationRead(item.id).catch(() => {});
    if (item.link) {
      onNavigate?.(item.link);
      setOpen(false);
    }
  };

  const handleMarkAll = async () => {
    if (!unreadCount) return;
    await markAllNotificationsRead().catch(() => {});
    onToast?.({ title: "Marcadas como leídas", message: "Todas las notificaciones activas quedaron revisadas." });
  };

  const handleClearArchived = async () => {
    if (!archivedCount) return;
    await clearArchivedNotifications().catch(() => {});
    onToast?.({ title: "Archivadas eliminadas", message: "Se limpiaron las notificaciones archivadas." });
  };

  return (
    <div ref={shellRef} style={{ position: "relative" }}>
      <style>{BELL_CSS}</style>

      {/* ═══ BELL BUTTON ═══ */}
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setBellHovered(true)}
        onMouseLeave={() => setBellHovered(false)}
        aria-label="Abrir notificaciones"
        aria-expanded={open}
        style={{
          width: 38,
          height: 38,
          borderRadius: "var(--eco-radius-md)",
          border: `1px solid ${open ? "var(--eco-primary-300)" : bellHovered ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
          background: open ? "var(--eco-primary-50)" : bellHovered ? "var(--eco-card-muted)" : "var(--eco-card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: open ? "var(--eco-primary-600)" : bellHovered ? "var(--eco-primary-500)" : "var(--eco-text-soft)",
          position: "relative",
          transition: "all 180ms ease",
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              minWidth: 18,
              height: 18,
              borderRadius: "var(--eco-radius-full)",
              background: "var(--eco-danger)",
              color: "white",
              border: "2px solid var(--eco-card)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              fontFamily: fm,
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1,
              animation: "ctPulse .6s ease-out",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ═══ NOTIFICATION PANEL ═══ */}
      {open && (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "min(420px, calc(100vw - 32px))",
            maxHeight: "min(72vh, 620px)",
            background: "var(--eco-card)",
            border: "1px solid var(--eco-border)",
            borderRadius: "var(--eco-radius-xl)",
            boxShadow: "0 20px 50px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)",
            overflow: "hidden",
            zIndex: 45,
            display: "flex",
            flexDirection: "column",
            animation: "ctBellPop .22s cubic-bezier(.33,1,.68,1) both",
          }}
        >
          {/* ─── Header ─── */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--eco-border)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "var(--eco-radius-md)",
                    background: "linear-gradient(135deg,var(--eco-primary-500),var(--eco-primary-700))",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={15} />
                </div>
                <div>
                  <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 800, color: "var(--eco-text-strong)" }}>
                    Notificaciones
                  </p>
                  <p style={{ margin: "2px 0 0", fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                    {unreadCount ? `${unreadCount} sin leer` : "Todo al día"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={!unreadCount}
                style={{
                  height: 28,
                  padding: "0 10px",
                  borderRadius: "var(--eco-radius-full)",
                  border: `1px solid ${unreadCount ? "var(--eco-primary-200)" : "var(--eco-border)"}`,
                  background: unreadCount ? "var(--eco-primary-50)" : "transparent",
                  color: unreadCount ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
                  fontFamily: fb,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: unreadCount ? "pointer" : "default",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  opacity: unreadCount ? 1 : 0.5,
                  transition: "all 150ms",
                }}
              >
                <CheckCheck size={12} />
                Leer todas
              </button>
            </div>

            {/* ─── Filter tabs ─── */}
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.id;
                const count = filterCounts[filter.id];
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    style={{
                      height: 28,
                      padding: "0 10px",
                      borderRadius: "var(--eco-radius-full)",
                      border: `1px solid ${active ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                      background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
                      color: active ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
                      fontFamily: fb,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      transition: "all 150ms ease",
                    }}
                  >
                    {filter.label}
                    <span
                      style={{
                        minWidth: 16,
                        height: 16,
                        borderRadius: "var(--eco-radius-full)",
                        background: active ? "var(--eco-primary-500)" : "var(--eco-card-muted)",
                        color: active ? "white" : "var(--eco-text-soft)",
                        fontFamily: fm,
                        fontSize: 9,
                        fontWeight: 800,
                        display: "inline-grid",
                        placeItems: "center",
                        padding: "0 4px",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Notification list ─── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            {!panelReady ? (
              <PanelSkeleton />
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    margin: "0 auto 14px",
                    borderRadius: "50%",
                    background: "var(--eco-card-muted)",
                    color: "var(--eco-text-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BellOff size={22} />
                </div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 15, fontWeight: 700, color: "var(--eco-text-strong)" }}>
                  {activeFilter === "unread"
                    ? "No tienes notificaciones pendientes"
                    : activeFilter === "archived"
                      ? "No hay notificaciones archivadas"
                      : "Sin notificaciones por ahora"}
                </p>
                <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 12, lineHeight: 1.55, color: "var(--eco-text-soft)" }}>
                  {activeFilter === "unread"
                    ? "¡Estás al día! Las nuevas aparecerán aquí."
                    : activeFilter === "archived"
                      ? "Archiva notificaciones para verlas aquí."
                      : "Cuando registres datos o exportes reportes, aparecerán aquí."}
                </p>
              </div>
            ) : (
              <div style={{ padding: 6 }}>
                {filteredItems.map((item, index) => {
                  const meta = getTypeMeta(item.type);
                  const Icon = meta.icon;
                  const isUnread = item.status === "unread";
                  const isArchived = item.status === "archived";
                  const isHovered = hoveredId === item.id;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        borderRadius: "var(--eco-radius-lg)",
                        background: isHovered ? "var(--eco-card-muted)" : "transparent",
                        borderLeft: isUnread ? "3px solid var(--eco-primary-500)" : "3px solid transparent",
                        transition: "all 160ms ease",
                        marginBottom: 2,
                        animation: `ctItemIn .2s ease-out ${Math.min(index * 30, 180)}ms both`,
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleItemClick(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleItemClick(item);
                          }
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          background: "transparent",
                          padding: "10px 10px 10px 9px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          cursor: item.link ? "pointer" : "default",
                          textAlign: "left",
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "var(--eco-radius-md)",
                            background: meta.bg,
                            color: meta.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "transform 180ms",
                            transform: isHovered ? "scale(1.06)" : "scale(1)",
                          }}
                        >
                          <Icon size={15} />
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <p
                              style={{
                                margin: 0,
                                fontFamily: fd,
                                fontSize: 13,
                                fontWeight: isUnread ? 800 : 600,
                                color: "var(--eco-text-strong)",
                                lineHeight: 1.3,
                              }}
                            >
                              {item.title}
                            </p>
                            {isUnread && (
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "var(--eco-primary-500)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            {isArchived && (
                              <span
                                style={{
                                  padding: "1px 6px",
                                  borderRadius: "var(--eco-radius-full)",
                                  background: "var(--eco-card-muted)",
                                  color: "var(--eco-text-soft)",
                                  fontFamily: fb,
                                  fontSize: 9,
                                  fontWeight: 700,
                                }}
                              >
                                Archivada
                              </span>
                            )}
                          </div>

                          <p
                            style={{
                              margin: "3px 0 0",
                              fontFamily: fb,
                              fontSize: 12,
                              lineHeight: 1.45,
                              color: "var(--eco-text-soft)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {item.message}
                          </p>

                          {/* Time + link */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                            <span style={{ fontFamily: fb, fontSize: 10, color: "var(--eco-text-soft)", opacity: 0.7 }}>
                              {formatRelativeTime(item.createdAt)}
                            </span>
                            {item.link && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                  fontFamily: fb,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: "var(--eco-primary-600)",
                                  transition: "gap 150ms",
                                }}
                              >
                                Ver detalle
                                <ChevronRight size={10} />
                              </span>
                            )}
                          </div>

                          {/* Actions (visible on hover) */}
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              marginTop: 8,
                              opacity: isHovered ? 1 : 0,
                              maxHeight: isHovered ? 30 : 0,
                              overflow: "hidden",
                              transition: "all 180ms ease",
                            }}
                          >
                            <MiniAction
                              icon={isUnread ? Check : CheckCheck}
                              label={isUnread ? "Leída" : "No leída"}
                              onClick={async (event) => {
                                event.stopPropagation();
                                if (isUnread) await markNotificationRead(item.id).catch(() => {});
                                else await markNotificationUnread(item.id).catch(() => {});
                              }}
                            />
                            {!isArchived && (
                              <MiniAction
                                icon={FolderArchive}
                                label="Archivar"
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  await archiveNotification(item.id).catch(() => {});
                                  onToast?.({ title: "Archivada", message: "La notificación se movió a archivadas." });
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Footer ─── */}
          <div
            style={{
              borderTop: "1px solid var(--eco-border)",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              background: "var(--eco-surface)",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={handleClearArchived}
              disabled={!archivedCount}
              style={{
                border: "none",
                background: "transparent",
                color: archivedCount ? "var(--eco-text-soft)" : "var(--eco-text-soft)",
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                cursor: archivedCount ? "pointer" : "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 0",
                opacity: archivedCount ? 1 : 0.4,
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (archivedCount) e.currentTarget.style.color = "var(--eco-danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--eco-text-soft)";
              }}
            >
              <Trash2 size={12} />
              Borrar archivadas
              {archivedCount > 0 && (
                <span style={{ fontFamily: fm, fontSize: 10, opacity: 0.7 }}>({archivedCount})</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate?.("/configuracion");
                setOpen(false);
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "var(--eco-primary-600)",
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 0",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Settings size={12} />
              Preferencias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
