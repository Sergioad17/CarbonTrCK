import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminProvider } from "./AdminContext";
import AdminShell from "./layout/AdminShell";
import AdminHomePage from "./views/AdminHomePage";
import InstitutionalConfigPage from "./views/InstitutionalConfigPage";
import SystemConfigPage from "./views/SystemConfigPage";
import SecurityPage from "./views/SecurityPage";
import AuditLogPage from "./views/AuditLogPage";
import AdminEmptyState from "./components/AdminEmptyState";

function viewFromSearch(search) {
  const p = new URLSearchParams(search);
  const v = p.get("view");
  return v && v.startsWith("admin-") ? v : "admin-home";
}

/* ─── View router ─────────────────────────────────────────────────────── */
function AdminViewRouter({ view }) {
  switch (view) {
    case "admin-home":           return <AdminHomePage />;
    case "admin-institutional":  return <InstitutionalConfigPage />;
    case "admin-system":         return <SystemConfigPage />;
    case "admin-security":       return <SecurityPage />;
    case "admin-audit":          return <AuditLogPage />;
    default:
      return (
        <div style={{
          background: "var(--eco-card, #fff)",
          border: "1px solid var(--eco-border, #E2E8F0)",
          borderRadius: 12,
        }}>
          <AdminEmptyState
            title="Módulo no disponible"
            description="Este módulo administrativo estará habilitado en una próxima fase de desarrollo."
          />
        </div>
      );
  }
}

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = viewFromSearch(location.search);

  function handleNavigate(viewId) {
    navigate(`/admin/avanzado?view=${viewId}`, { replace: true });
  }

  return (
    <AdminProvider value={{ navigate: handleNavigate }}>
      <AdminShell activeView={activeView} onNavigate={handleNavigate}>
        <AdminViewRouter view={activeView} />
      </AdminShell>
    </AdminProvider>
  );
}
