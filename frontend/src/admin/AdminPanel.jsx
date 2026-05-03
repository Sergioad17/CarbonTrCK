import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AdminProvider } from "./AdminContext";
import AdminShell from "./layout/AdminShell";
import AdminHomePage from "./views/AdminHomePage";
import InstitutionalConfigPage from "./views/InstitutionalConfigPage";
import SystemConfigPage from "./views/SystemConfigPage";
import SecurityPage from "./views/SecurityPage";
import AuditLogPage from "./views/AuditLogPage";
import UsersPage from "./views/UsersPage";
import RolesPage from "./views/RolesPage";
import OrgStructurePage from "./views/OrgStructurePage";
import CatalogsPage from "./views/CatalogsPage";
import PeriodsPage from "./views/PeriodsPage";
import EmissionFactorsPage from "./views/EmissionFactorsPage";
import CaptureConfigPage from "./views/CaptureConfigPage";
import DevicesPage from "./views/DevicesPage";
import RecordsPage from "./views/RecordsPage";
import ValidationPage from "./views/ValidationPage";
import EmissionsCalcPage from "./views/EmissionsCalcPage";
import GoalsPage from "./views/GoalsPage";
import AlertsPage from "./views/AlertsPage";
import ReportsPage from "./views/ReportsPage";
import BackupsPage from "./views/BackupsPage";
import HelpDocsPage from "./views/HelpDocsPage";
import AIControlPage from "./views/AIControlPage";
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
    case "admin-users":          return <UsersPage />;
    case "admin-roles":          return <RolesPage />;
    case "admin-org":            return <OrgStructurePage />;
    case "admin-catalogs":       return <CatalogsPage />;
    case "admin-periods":        return <PeriodsPage />;
    case "admin-factors":        return <EmissionFactorsPage />;
    case "admin-capture":        return <CaptureConfigPage />;
    case "admin-devices":        return <DevicesPage />;
    case "admin-records":        return <RecordsPage />;
    case "admin-validation":     return <ValidationPage />;
    case "admin-emissions":      return <EmissionsCalcPage />;
    case "admin-targets":        return <GoalsPage />;
    case "admin-alerts":         return <AlertsPage />;
    case "admin-reports":        return <ReportsPage />;
    case "admin-backups":        return <BackupsPage />;
    case "admin-help":           return <HelpDocsPage />;
    case "admin-ai":             return <AIControlPage />;
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
