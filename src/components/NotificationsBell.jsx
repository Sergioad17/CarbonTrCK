import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Beaker,
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
  archive,
  clearArchived,
  countUnread,
  list,
  markAllRead,
  markRead,
  markUnread,
  subscribe,
} from "../lib/notificationsStore";

const fd = "var(--eco-font-display)";
const fb = "var(--eco-font-body)";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "unread", label: "No leídas" },
  { id: "archived", label: "Archivadas" },
];

function getTypeMeta(type) {
  if (type === "record_created") {
    return { icon: FilePlus2, color: "var(--eco-success)", bg: "var(--eco-success-bg)" };
  }
  if (type === "record_imported") {
    return { icon: Upload, color: "var(--eco-info)", bg: "var(--eco-info-bg)" };
  }
  if (type === "export_done") {
    return { icon: Download, color: "var(--eco-primary-600)", bg: "var(--eco-primary-50)" };
  }
  if (type === "factor_updated") {
    return { icon: Beaker, color: "var(--eco-secondary-600)", bg: "var(--eco-warning-bg)" };
  }
  if (type === "goal_risk") {
    return { icon: AlertTriangle, color: "var(--eco-warning)", bg: "var(--eco-warning-bg)" };
  }
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

export default function NotificationsBell({ onNavigate, onToast }) {
  const shellRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [items, setItems] = useState(() => list());
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => subscribe(setItems), []);

  useEffect(() => {
    if (!open) return undefined;

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
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const unreadCount = useMemo(() => countUnread(), [items]);
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

  const handleItemClick = (item) => {
    if (item.status === "unread") markRead(item.id);
    if (item.link) {
      onNavigate?.(item.link);
      setOpen(false);
    }
  };

  const handleMarkAll = () => {
    if (!unreadCount) return;
    markAllRead();
    onToast?.({ title: "Marcadas como leídas", message: "Todas las notificaciones activas quedaron revisadas." });
  };

  const handleClearArchived = () => {
    if (!archivedCount) return;
    clearArchived();
    onToast?.({ title: "Archivadas eliminadas", message: "Se limpiaron las notificaciones archivadas." });
  };

  return (
    <div ref={shellRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Abrir notificaciones"
        aria-expanded={open}
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--eco-radius-md)",
          border: "1px solid var(--eco-border)",
          background: open ? "var(--eco-card-muted)" : "var(--eco-card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "var(--eco-text-soft)",
          position: "relative",
          transition: "background 180ms ease, border-color 180ms ease, transform 180ms ease",
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              borderRadius: "var(--eco-radius-full)",
              background: "var(--eco-danger)",
              color: "var(--eco-text-strong)",
              border: "2px solid var(--eco-card)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              fontFamily: fb,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

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
            boxShadow: "var(--eco-shadow-xl)",
            overflow: "hidden",
            zIndex: 45,
            animation: "eco-fadeInUp 0.22s ease both",
          }}
        >
          <div
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid var(--eco-border)",
              background: "var(--eco-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 18, fontWeight: 800, color: "var(--eco-text-strong)" }}>
                  Notificaciones
                </p>
                <p style={{ margin: "3px 0 0", fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft)" }}>
                  {unreadCount ? `${unreadCount} pendiente(s) por revisar` : "Todo está al día"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  border: "none",
                  background: "transparent",
                  color: unreadCount ? "var(--eco-primary-600)" : "var(--eco-text-soft)",
                  fontFamily: fb,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: unreadCount ? "pointer" : "default",
                  padding: 0,
                }}
              >
                Marcar todas como leídas
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              {FILTERS.map((filter) => {
                const active = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: "var(--eco-radius-full)",
                      border: `1px solid ${active ? "var(--eco-primary-300)" : "var(--eco-border)"}`,
                      background: active ? "var(--eco-primary-50)" : "var(--eco-card)",
                      color: active ? "var(--eco-primary-700)" : "var(--eco-text-soft)",
                      fontFamily: fb,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {filter.label}
                    <span style={{ fontSize: 11, opacity: 0.9 }}>{filterCounts[filter.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ maxHeight: "calc(min(72vh, 620px) - 142px)", overflowY: "auto", padding: 8 }}>
            {filteredItems.length === 0 ? (
              <div
                style={{
                  padding: "30px 18px",
                  textAlign: "center",
                  color: "var(--eco-text-soft)",
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    margin: "0 auto 12px",
                    borderRadius: "50%",
                    background: "var(--eco-card-muted)",
                    color: "var(--eco-text-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bell size={22} />
                </div>
                <p style={{ margin: 0, fontFamily: fd, fontSize: 16, fontWeight: 700, color: "var(--eco-text-strong)" }}>
                  No tienes notificaciones por ahora.
                </p>
                <p style={{ margin: "6px 0 0", fontFamily: fb, fontSize: 12, lineHeight: 1.6 }}>
                  Cuando registres datos o exportes reportes, aparecerán aquí.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const meta = getTypeMeta(item.type);
                const Icon = meta.icon;
                const isUnread = item.status === "unread";
                const isHovered = hoveredId === item.id;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      borderRadius: "var(--eco-radius-lg)",
                      background: isHovered ? "var(--eco-card-muted)" : "transparent",
                      transition: "background 180ms ease",
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
                        padding: "12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        cursor: item.link ? "pointer" : "default",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "var(--eco-radius-md)",
                          background: meta.bg,
                          color: meta.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <p
                            style={{
                              margin: 0,
                              fontFamily: fd,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--eco-text-strong)",
                            }}
                          >
                            {item.title}
                          </p>
                          {isUnread && (
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "var(--eco-radius-full)",
                                background: "var(--eco-primary-50)",
                                color: "var(--eco-primary-700)",
                                border: "1px solid var(--eco-primary-200)",
                                fontFamily: fb,
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Nuevo
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            margin: "4px 0 0",
                            fontFamily: fb,
                            fontSize: 12,
                            lineHeight: 1.55,
                            color: "var(--eco-text-soft)",
                          }}
                        >
                          {item.message}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: fb, fontSize: 11, color: "var(--eco-text-soft)" }}>
                            {formatRelativeTime(item.createdAt)}
                          </span>
                          {item.link && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 2,
                                fontFamily: fb,
                                fontSize: 11,
                                color: "var(--eco-primary-600)",
                              }}
                            >
                              Ir al detalle
                              <ChevronRight size={12} />
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isUnread) {
                                markRead(item.id);
                              } else {
                                markUnread(item.id);
                              }
                            }}
                            style={{
                              height: 28,
                              padding: "0 10px",
                              borderRadius: "var(--eco-radius-full)",
                              border: "1px solid var(--eco-border)",
                              background: "var(--eco-card)",
                              color: "var(--eco-text-soft)",
                              fontFamily: fb,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {isUnread ? <Check size={12} /> : <CheckCheck size={12} />}
                            {isUnread ? "Marcar como leída" : "Marcar como no leída"}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              archive(item.id);
                              onToast?.({ title: "Archivada", message: "La notificación se movió a archivadas." });
                            }}
                            style={{
                              height: 28,
                              padding: "0 10px",
                              borderRadius: "var(--eco-radius-full)",
                              border: "1px solid var(--eco-border)",
                              background: "var(--eco-card)",
                              color: "var(--eco-text-soft)",
                              fontFamily: fb,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <FolderArchive size={12} />
                            Archivar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--eco-border)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              background: "var(--eco-card)",
            }}
          >
            <button
              type="button"
              onClick={handleClearArchived}
              style={{
                border: "none",
                background: "transparent",
                color: archivedCount ? "var(--eco-text-soft)" : "var(--eco-text-soft)",
                fontFamily: fb,
                fontSize: 12,
                fontWeight: 700,
                cursor: archivedCount ? "pointer" : "default",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                opacity: archivedCount ? 1 : 0.6,
              }}
            >
              <Trash2 size={13} />
              Borrar archivadas
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
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
              }}
            >
              <Settings size={13} />
              Preferencias
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
