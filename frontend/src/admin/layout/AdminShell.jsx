import React from "react";
import AdminSubNav from "./AdminSubNav";

const fb = "var(--eco-font-body)";

/* ─── CSS keyframes injected once ─────────────────────────────────────── */
const ADMIN_CSS = `
@keyframes adminFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (max-width: 1024px) {
  .admin-content-inner {
    padding: 20px 20px 32px !important;
  }
}
@media (max-width: 768px) {
  .admin-shell-subnav {
    position: fixed !important;
    top: 0 !important; left: 0 !important; bottom: 0 !important;
    z-index: 50 !important;
    box-shadow: 8px 0 24px rgba(0,0,0,.12) !important;
  }
  .admin-content-inner {
    padding: 16px 14px 28px !important;
  }
  .admin-home-grid-2col {
    grid-template-columns: 1fr !important;
  }
}
`;

export default function AdminShell({ activeView, onNavigate, children }) {
  const [subNavOpen, setSubNavOpen] = React.useState(true);

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="eco-pattern3" style={{
        display: "flex", height: "100%", minHeight: 0,
      }}>
        {/* Sub-navigation panel */}
        <div className="admin-shell-subnav">
          <AdminSubNav
            activeView={activeView}
            onNavigate={(id) => {
              onNavigate?.(id);
              /* auto-close on mobile */
              if (window.innerWidth <= 768) setSubNavOpen(false);
            }}
            onClose={() => setSubNavOpen(false)}
            visible={subNavOpen}
          />
        </div>

        {/* Main content area */}
        <div style={{
          flex: 1, minWidth: 0, overflow: "auto",
          display: "flex", flexDirection: "column",
        }}>
          {/* Thin top bar when subnav is collapsed */}
          {!subNavOpen && (
            <div style={{
              padding: "8px 24px",
              borderBottom: "1px solid var(--eco-border, #E2E8F0)",
              background: "var(--eco-card, #fff)",
              display: "flex", alignItems: "center", gap: 10,
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSubNavOpen(true)}
                style={{
                  padding: "5px 12px", borderRadius: 7,
                  border: "1px solid var(--eco-border, #E2E8F0)",
                  background: "transparent",
                  fontFamily: fb, fontSize: 12, fontWeight: 500,
                  color: "var(--eco-text, #1E293B)",
                  cursor: "pointer", transition: "all .15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--eco-card-muted, #F8FAFC)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: 15 }}>☰</span> Menú admin
              </button>
              <span style={{
                fontFamily: fb, fontSize: 12, color: "var(--eco-text-soft, #94A3B8)",
              }}>
                Administración avanzada
              </span>
            </div>
          )}

          {/* Page content */}
          <div className="admin-content-inner" style={{
            flex: 1, padding: "24px 28px 40px",
            maxWidth: 1280, width: "100%",
            animation: "adminFadeIn .35s ease-out both",
          }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
