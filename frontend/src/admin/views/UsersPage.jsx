import React from "react";
import {
  UserPlus,
  Mail,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit3,
  Shield,
  Building2,
  Users as UsersIcon,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import AdminPageHeader from "../layout/AdminPageHeader";
import AdminFilterBar from "../components/AdminFilterBar";
import AdminDataTable from "../components/AdminDataTable";
import AdminStatusBadge from "../components/AdminStatusBadge";
import AdminFormModal from "../components/AdminFormModal";
import AdminEntityDrawer, { DrawerField } from "../components/AdminEntityDrawer";
import AdminConfirmDialog from "../components/AdminConfirmDialog";
import { AdminTextField, AdminSelectField, AdminToggleField } from "../components/AdminFormSection";
import { users as mockUsers, roles, campuses } from "../mocks/adminMocks";

const fb = "var(--eco-font-body)";
const fm = "var(--eco-font-mono)";

const ROLE_COLORS = { admin: "#7C3AED", directivo: "#2563EB", operativo: "#059669", consulta: "#64748B" };
const ROLE_LABELS = { admin: "Admin", directivo: "Directivo", operativo: "Operativo", consulta: "Consulta" };

const EMPTY_USER = {
  name: "",
  email: "",
  identifier: "",
  role: "operativo",
  campus: "Campus Central",
  areas: [],
  status: "active",
  forcePasswordChange: false,
  notes: "",
};

const ALL_AREAS = [
  "Direccion General",
  "TI",
  "Sustentabilidad",
  "Mantenimiento",
  "Rectoria",
  "Laboratorios",
  "Instalaciones",
  "Direccion Academica",
  "Administracion",
  "Investigacion",
  "Direccion Administrativa",
];

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || "#64748B";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 9px",
      borderRadius: 10,
      background: `${color}14`,
      fontFamily: fb,
      fontSize: 11,
      fontWeight: 600,
      color,
      whiteSpace: "nowrap",
    }}>
      <Shield size={10} /> {ROLE_LABELS[role] || role}
    </span>
  );
}

function AdminActionButton({ icon: Icon, label, onClick, accent = "default" }) {
  const styles = {
    default: {
      border: "1px solid var(--eco-border, #E2E8F0)",
      background: "var(--eco-card, #fff)",
      color: "var(--eco-text, #1E293B)",
      hover: "var(--eco-card-muted, #F8FAFC)",
    },
    info: {
      border: "1px solid rgba(37,99,235,.18)",
      background: "rgba(37,99,235,.06)",
      color: "var(--eco-info, #2563EB)",
      hover: "rgba(37,99,235,.12)",
    },
    warning: {
      border: "1px solid rgba(234,179,8,.2)",
      background: "rgba(234,179,8,.08)",
      color: "var(--eco-warning, #CA8A04)",
      hover: "rgba(234,179,8,.14)",
    },
    danger: {
      border: "1px solid rgba(239,68,68,.2)",
      background: "rgba(239,68,68,.06)",
      color: "var(--eco-danger, #DC2626)",
      hover: "rgba(239,68,68,.12)",
    },
    success: {
      border: "1px solid rgba(34,197,94,.18)",
      background: "rgba(34,197,94,.08)",
      color: "var(--eco-success, #16A34A)",
      hover: "rgba(34,197,94,.14)",
    },
  };

  const style = styles[accent] || styles.default;

  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "7px 12px",
        borderRadius: 8,
        fontFamily: fb,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all .12s",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = style.hover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = style.background;
      }}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function FeedbackBanner({ feedback, onClose }) {
  if (!feedback) return null;

  const tones = {
    success: {
      border: "rgba(34,197,94,.2)",
      background: "rgba(34,197,94,.08)",
      color: "var(--eco-success, #16A34A)",
      icon: CheckCircle2,
    },
    info: {
      border: "rgba(37,99,235,.18)",
      background: "rgba(37,99,235,.06)",
      color: "var(--eco-info, #2563EB)",
      icon: Mail,
    },
  };

  const tone = tones[feedback.tone] || tones.info;
  const Icon = tone.icon;

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 16,
      padding: "12px 16px",
      borderRadius: 12,
      border: `1px solid ${tone.border}`,
      background: tone.background,
      color: tone.color,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "rgba(255,255,255,.65)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={tone.color} />
        </div>
        <div>
          <div style={{
            fontFamily: fb,
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--eco-text, #1E293B)",
          }}>
            {feedback.title}
          </div>
          <div style={{
            marginTop: 3,
            fontFamily: fb,
            fontSize: 12.5,
            color: "var(--eco-text-soft, #475569)",
            lineHeight: 1.5,
          }}>
            {feedback.message}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--eco-text-soft, #64748B)",
          cursor: "pointer",
          fontFamily: fb,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Cerrar
      </button>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createTemporaryPassword() {
  const block = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CT-${block}-${new Date().getMinutes().toString().padStart(2, "0")}`;
}

export default function UsersPage() {
  const [usersList, setUsersList] = React.useState(mockUsers);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  const [drawerUser, setDrawerUser] = React.useState(null);
  const [modalUser, setModalUser] = React.useState(null);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [adminAction, setAdminAction] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);

  const areaOptions = React.useMemo(() => {
    return Array.from(new Set([
      ...ALL_AREAS,
      ...usersList.flatMap((user) => user.areas || []),
    ])).sort((a, b) => a.localeCompare(b));
  }, [usersList]);

  const filtered = React.useMemo(() => {
    let list = [...usersList];

    if (search) {
      const query = search.toLowerCase();
      list = list.filter((user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.identifier.toLowerCase().includes(query)
      );
    }

    if (filters.role && filters.role !== "all") {
      list = list.filter((user) => user.role === filters.role);
    }
    if (filters.status && filters.status !== "all") {
      list = list.filter((user) => user.status === filters.status);
    }
    if (filters.campus && filters.campus !== "all") {
      list = list.filter((user) => user.campus === filters.campus);
    }
    if (filters.area && filters.area !== "all") {
      list = list.filter((user) => (user.areas || []).includes(filters.area));
    }

    return list;
  }, [filters, search, usersList]);

  function syncSelectedUser(userId, updater) {
    setDrawerUser((current) => (current?.id === userId ? updater(current) : current));
    setAdminAction((current) => (current?.user?.id === userId ? { ...current, user: updater(current.user) } : current));
  }

  function handleSaveUser() {
    setSaving(true);
    setTimeout(() => {
      if (modalUser.id) {
        setUsersList((prev) => prev.map((user) => (user.id === modalUser.id ? { ...user, ...modalUser } : user)));
        syncSelectedUser(modalUser.id, (user) => ({ ...user, ...modalUser }));
        setFeedback({
          tone: "success",
          title: "Usuario actualizado",
          message: `Se actualizaron los datos administrativos de ${modalUser.name}.`,
        });
      } else {
        const newUser = {
          ...modalUser,
          id: `u${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          lastAccess: null,
        };
        setUsersList((prev) => [...prev, newUser]);
        setFeedback({
          tone: "success",
          title: "Usuario creado",
          message: `La cuenta de ${newUser.name} quedo lista para asignacion y seguimiento.`,
        });
      }

      setSaving(false);
      setModalUser(null);
    }, 500);
  }

  function handleToggleStatus(user) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    setUsersList((prev) => prev.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)));
    syncSelectedUser(user.id, (current) => ({ ...current, status: nextStatus }));
    setFeedback({
      tone: "info",
      title: nextStatus === "active" ? "Usuario reactivado" : "Usuario desactivado",
      message: nextStatus === "active"
        ? `${user.name} ya puede volver a iniciar sesion.`
        : `${user.name} quedo sin acceso al panel hasta nueva activacion.`,
    });
    setConfirmAction(null);
  }

  function handleDeleteUser(user) {
    setUsersList((prev) => prev.filter((item) => item.id !== user.id));
    setDrawerUser(null);
    setAdminAction(null);
    setFeedback({
      tone: "info",
      title: "Usuario eliminado",
      message: `La cuenta de ${user.name} fue retirada del listado local.`,
    });
    setConfirmAction(null);
  }

  function openPasswordReset(user) {
    setAdminAction({
      type: "password",
      user,
      temporaryPassword: createTemporaryPassword(),
      forcePasswordChange: true,
      note: "",
    });
  }

  function openEmailChange(user) {
    setAdminAction({
      type: "email",
      user,
      newEmail: user.email,
      note: "",
    });
  }

  function handleResetPassword() {
    if (!adminAction?.user) return;

    const updatedFields = {
      forcePasswordChange: adminAction.forcePasswordChange,
      lastPasswordResetAt: new Date().toISOString(),
      notes: adminAction.note
        ? [adminAction.user.notes, `Reset local: ${adminAction.note}`].filter(Boolean).join("\n")
        : adminAction.user.notes,
    };

    setUsersList((prev) => prev.map((user) => (
      user.id === adminAction.user.id ? { ...user, ...updatedFields } : user
    )));
    syncSelectedUser(adminAction.user.id, (user) => ({ ...user, ...updatedFields }));
    setFeedback({
      tone: "success",
      title: "Contrasena restablecida",
      message: `Se genero una clave temporal para ${adminAction.user.name}: ${adminAction.temporaryPassword}. ${
        adminAction.forcePasswordChange ? "Se forzo cambio en el proximo acceso." : "El cambio obligatorio quedo desactivado."
      }`,
    });
    setAdminAction(null);
  }

  function handleChangeEmail() {
    if (!adminAction?.user) return;

    const nextEmail = adminAction.newEmail.trim();
    if (!nextEmail) return;

    const updatedFields = {
      email: nextEmail,
      notes: adminAction.note
        ? [adminAction.user.notes, `Cambio de correo: ${adminAction.note}`].filter(Boolean).join("\n")
        : adminAction.user.notes,
    };

    setUsersList((prev) => prev.map((user) => (
      user.id === adminAction.user.id ? { ...user, ...updatedFields } : user
    )));
    syncSelectedUser(adminAction.user.id, (user) => ({ ...user, ...updatedFields }));
    setFeedback({
      tone: "info",
      title: "Correo actualizado",
      message: `${adminAction.user.name} ahora usa ${nextEmail} como correo administrativo.`,
    });
    setAdminAction(null);
  }

  const activeCount = usersList.filter((user) => user.status === "active").length;
  const inactiveCount = usersList.filter((user) => user.status === "inactive").length;

  const columns = [
    {
      key: "name",
      label: "Usuario",
      width: "28%",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{row.name}</div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 2,
            fontSize: 11.5,
            color: "var(--eco-text-soft, #94A3B8)",
            fontFamily: fm,
            flexWrap: "wrap",
          }}>
            <span>{row.email}</span>
            <span>{row.identifier}</span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      width: "12%",
      render: (value) => <RoleBadge role={value} />,
    },
    {
      key: "areas",
      label: "Area",
      width: "16%",
      render: (value = []) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>
            {value[0] || "Sin area"}
          </span>
          {value.length > 1 && (
            <span style={{ fontSize: 11, color: "var(--eco-text-soft, #94A3B8)" }}>
              +{value.length - 1} asignada{value.length > 2 ? "s" : ""}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "campus",
      label: "Campus",
      width: "14%",
      render: (value) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Building2 size={12} color="var(--eco-text-soft, #94A3B8)" />
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      width: "10%",
      render: (value) => (
        <AdminStatusBadge
          variant={value === "active" ? "success" : "neutral"}
          label={value === "active" ? "Activo" : "Inactivo"}
        />
      ),
    },
    {
      key: "lastAccess",
      label: "Ultimo acceso",
      width: "14%",
      nowrap: true,
      render: (value) => (
        <span style={{ fontSize: 12, color: "var(--eco-text-soft, #64748B)" }}>
          {fmtDateTime(value)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      width: "18%",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <AdminActionButton
            icon={Edit3}
            label="Editar"
            onClick={(event) => {
              event.stopPropagation();
              setModalUser({ ...row });
            }}
          />
          <AdminActionButton
            icon={Mail}
            label="Correo"
            accent="info"
            onClick={(event) => {
              event.stopPropagation();
              openEmailChange(row);
            }}
          />
          <AdminActionButton
            icon={KeyRound}
            label="Clave"
            accent="warning"
            onClick={(event) => {
              event.stopPropagation();
              openPasswordReset(row);
            }}
          />
        </div>
      ),
    },
  ];

  const passwordActionOpen = adminAction?.type === "password";
  const emailActionOpen = adminAction?.type === "email";

  return (
    <>
      <AdminPageHeader
        title="Usuarios y permisos"
        subtitle={`${activeCount} activos · ${inactiveCount} inactivos · ${usersList.length} total`}
        icon={UsersIcon}
        breadcrumb={["Operacion", "Usuarios"]}
        actions={(
          <button
            onClick={() => setModalUser({ ...EMPTY_USER })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "var(--eco-primary-500, #22C55E)",
              fontFamily: fb,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              transition: "all .12s",
              boxShadow: "0 1px 3px rgba(34,197,94,.25)",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "var(--eco-primary-600, #16A34A)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "var(--eco-primary-500, #22C55E)";
            }}
          >
            <UserPlus size={14} /> Nuevo usuario
          </button>
        )}
      />

      <FeedbackBanner feedback={feedback} onClose={() => setFeedback(null)} />

      <div style={{ marginBottom: 16 }}>
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre, correo o ID..."
          filters={[
            { key: "role", label: "Rol", options: roles.filter((role) => role.enabled).map((role) => ({ value: role.id, label: role.label })) },
            { key: "status", label: "Estado", options: [{ value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }] },
            { key: "campus", label: "Campus", options: campuses.map((campus) => ({ value: campus.name, label: campus.name })) },
            { key: "area", label: "Area", options: areaOptions.map((area) => ({ value: area, label: area })) },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onClear={() => {
            setSearch("");
            setFilters({});
          }}
        />
      </div>

      <div style={{
        fontFamily: fb,
        fontSize: 12,
        color: "var(--eco-text-soft, #64748B)",
        marginBottom: 10,
      }}>
        {filtered.length === usersList.length
          ? `${usersList.length} usuarios`
          : `${filtered.length} de ${usersList.length} usuarios`}
      </div>

      <AdminDataTable
        columns={columns}
        data={filtered}
        sortable
        onRowClick={setDrawerUser}
        maxHeight={520}
        emptyMessage="No se encontraron usuarios con estos filtros."
      />

      <AdminEntityDrawer
        open={!!drawerUser}
        onClose={() => setDrawerUser(null)}
        title={drawerUser?.name}
        subtitle={drawerUser?.email}
        badge={drawerUser && <RoleBadge role={drawerUser.role} />}
        width={470}
        actions={drawerUser && (
          <>
            <AdminActionButton icon={Edit3} label="Editar" onClick={() => setModalUser({ ...drawerUser })} />
            <AdminActionButton icon={Mail} label="Cambiar correo" accent="info" onClick={() => openEmailChange(drawerUser)} />
            <AdminActionButton icon={KeyRound} label="Restablecer clave" accent="warning" onClick={() => openPasswordReset(drawerUser)} />
            <AdminActionButton
              icon={drawerUser.status === "active" ? ToggleRight : ToggleLeft}
              label={drawerUser.status === "active" ? "Desactivar" : "Activar"}
              accent={drawerUser.status === "active" ? "warning" : "success"}
              onClick={() => setConfirmAction({ type: "toggle", user: drawerUser })}
            />
            <AdminActionButton
              icon={Trash2}
              label="Eliminar"
              accent="danger"
              onClick={() => setConfirmAction({ type: "delete", user: drawerUser })}
            />
          </>
        )}
      >
        {drawerUser && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <DrawerField label="Identificador">{drawerUser.identifier}</DrawerField>
              <DrawerField label="Estado">
                <AdminStatusBadge
                  variant={drawerUser.status === "active" ? "success" : "neutral"}
                  label={drawerUser.status === "active" ? "Activo" : "Inactivo"}
                />
              </DrawerField>
              <DrawerField label="Campus">{drawerUser.campus}</DrawerField>
              <DrawerField label="Fecha de alta">{fmtDate(drawerUser.createdAt)}</DrawerField>
              <DrawerField label="Ultimo acceso">{fmtDateTime(drawerUser.lastAccess)}</DrawerField>
              <DrawerField label="Cambio obligatorio">
                {drawerUser.forcePasswordChange
                  ? <span style={{ color: "var(--eco-warning, #CA8A04)", fontWeight: 600 }}>Si</span>
                  : "No"}
              </DrawerField>
            </div>

            <div style={{
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--eco-card-muted, #F8FAFC)",
              border: "1px solid var(--eco-border, #E2E8F0)",
            }}>
              <div style={{
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--eco-text-soft, #94A3B8)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                marginBottom: 8,
              }}>
                Acciones administrativas
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AdminActionButton icon={Mail} label="Cambiar correo" accent="info" onClick={() => openEmailChange(drawerUser)} />
                <AdminActionButton icon={KeyRound} label="Restablecer contrasena" accent="warning" onClick={() => openPasswordReset(drawerUser)} />
              </div>
            </div>

            <div>
              <span style={{
                fontFamily: fb,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--eco-text-soft, #94A3B8)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}>
                Areas asignadas
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                {drawerUser.areas.length > 0 ? drawerUser.areas.map((area) => (
                  <span
                    key={area}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 8,
                      background: "var(--eco-card-muted, #F1F5F9)",
                      fontFamily: fb,
                      fontSize: 11.5,
                      fontWeight: 500,
                      color: "var(--eco-text, #1E293B)",
                    }}
                  >
                    {area}
                  </span>
                )) : <span style={{ opacity: 0.4, fontSize: 12 }}>Sin areas asignadas</span>}
              </div>
            </div>

            {drawerUser.notes && (
              <DrawerField label="Observaciones">{drawerUser.notes}</DrawerField>
            )}
          </>
        )}
      </AdminEntityDrawer>

      <AdminFormModal
        open={!!modalUser}
        onClose={() => setModalUser(null)}
        title={modalUser?.id ? "Editar usuario" : "Nuevo usuario"}
        subtitle={modalUser?.id ? modalUser.email : "Completa los datos del nuevo usuario"}
        onSave={handleSaveUser}
        saving={saving}
        width={580}
      >
        {modalUser && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <AdminTextField
                label="Nombre completo"
                required
                value={modalUser.name}
                onChange={(value) => setModalUser((prev) => ({ ...prev, name: value }))}
                placeholder="Nombre y apellido"
              />
              <AdminTextField
                label="Correo electronico"
                required
                type="email"
                value={modalUser.email}
                onChange={(value) => setModalUser((prev) => ({ ...prev, email: value }))}
                placeholder="usuario@institucion.mx"
              />
              <AdminTextField
                label="Identificador"
                value={modalUser.identifier}
                onChange={(value) => setModalUser((prev) => ({ ...prev, identifier: value }))}
                placeholder="ADM-001"
                hint="Matricula o codigo interno"
              />
              <AdminSelectField
                label="Rol"
                required
                value={modalUser.role}
                onChange={(value) => setModalUser((prev) => ({ ...prev, role: value }))}
                options={roles.filter((role) => role.enabled).map((role) => ({ value: role.id, label: role.label }))}
              />
              <AdminSelectField
                label="Campus"
                value={modalUser.campus}
                onChange={(value) => setModalUser((prev) => ({ ...prev, campus: value }))}
                options={campuses.map((campus) => ({ value: campus.name, label: campus.name }))}
              />
              <AdminSelectField
                label="Estado"
                value={modalUser.status}
                onChange={(value) => setModalUser((prev) => ({ ...prev, status: value }))}
                options={[
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
            </div>

            <div>
              <span style={{
                fontFamily: fb,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--eco-text-soft, #64748B)",
                letterSpacing: ".02em",
              }}>
                Areas asignadas
              </span>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginTop: 8,
              }}>
                {areaOptions.map((area) => {
                  const checked = modalUser.areas?.includes(area);
                  return (
                    <label
                      key={area}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontFamily: fb,
                        fontSize: 12.5,
                        color: "var(--eco-text, #1E293B)",
                        cursor: "pointer",
                        padding: "4px 0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setModalUser((prev) => ({
                            ...prev,
                            areas: checked
                              ? prev.areas.filter((item) => item !== area)
                              : [...(prev.areas || []), area],
                          }));
                        }}
                        style={{ accentColor: "var(--eco-primary-500, #22C55E)" }}
                      />
                      {area}
                    </label>
                  );
                })}
              </div>
            </div>

            <AdminToggleField
              label="Forzar cambio de contrasena en proximo inicio"
              checked={modalUser.forcePasswordChange}
              onChange={(value) => setModalUser((prev) => ({ ...prev, forcePasswordChange: value }))}
            />

            <AdminTextField
              label="Observaciones"
              multiline
              rows={2}
              value={modalUser.notes}
              onChange={(value) => setModalUser((prev) => ({ ...prev, notes: value }))}
              placeholder="Notas internas sobre este usuario..."
            />
          </>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={passwordActionOpen}
        onClose={() => setAdminAction(null)}
        title="Restablecer contrasena"
        subtitle={adminAction?.user ? `Cuenta: ${adminAction.user.email}` : ""}
        onSave={handleResetPassword}
        saving={false}
        width={520}
      >
        {passwordActionOpen && (
          <>
            <div style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid rgba(234,179,8,.2)",
              background: "rgba(234,179,8,.08)",
            }}>
              <div style={{
                fontFamily: fb,
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--eco-text, #1E293B)",
              }}>
                Restablecimiento administrativo
              </div>
              <div style={{
                marginTop: 4,
                fontFamily: fb,
                fontSize: 12.5,
                color: "var(--eco-text-soft, #64748B)",
                lineHeight: 1.5,
              }}>
                Este flujo es local y deja trazabilidad visual dentro del modulo sin depender de backend.
              </div>
            </div>

            <AdminTextField
              label="Clave temporal"
              value={adminAction.temporaryPassword}
              disabled
              hint="Usala para comunicar el acceso temporal al usuario."
            />

            <AdminActionButton
              icon={RefreshCw}
              label="Generar otra clave"
              accent="default"
              onClick={() => setAdminAction((prev) => ({ ...prev, temporaryPassword: createTemporaryPassword() }))}
            />

            <AdminToggleField
              label="Forzar cambio de contrasena al iniciar sesion"
              checked={adminAction.forcePasswordChange}
              onChange={(value) => setAdminAction((prev) => ({ ...prev, forcePasswordChange: value }))}
              description="Se actualiza el estado local del usuario para reflejar la medida de seguridad."
            />

            <AdminTextField
              label="Nota administrativa"
              multiline
              rows={2}
              value={adminAction.note}
              onChange={(value) => setAdminAction((prev) => ({ ...prev, note: value }))}
              placeholder="Motivo del restablecimiento o seguimiento interno"
            />
          </>
        )}
      </AdminFormModal>

      <AdminFormModal
        open={emailActionOpen}
        onClose={() => setAdminAction(null)}
        title="Cambiar correo"
        subtitle={adminAction?.user ? `Usuario: ${adminAction.user.name}` : ""}
        onSave={handleChangeEmail}
        saving={false}
        width={520}
      >
        {emailActionOpen && (
          <>
            <AdminTextField
              label="Correo actual"
              value={adminAction.user.email}
              disabled
            />
            <AdminTextField
              label="Nuevo correo"
              type="email"
              required
              value={adminAction.newEmail}
              onChange={(value) => setAdminAction((prev) => ({ ...prev, newEmail: value }))}
              placeholder="nuevo.correo@institucion.mx"
            />
            <AdminTextField
              label="Motivo del cambio"
              multiline
              rows={2}
              value={adminAction.note}
              onChange={(value) => setAdminAction((prev) => ({ ...prev, note: value }))}
              placeholder="Cambio de dominio, ajuste por plantilla o correccion de captura"
            />
          </>
        )}
      </AdminFormModal>

      <AdminConfirmDialog
        open={confirmAction?.type === "toggle"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleToggleStatus(confirmAction.user)}
        title={confirmAction?.user?.status === "active" ? "Desactivar usuario" : "Activar usuario"}
        message={confirmAction?.user?.status === "active"
          ? `¿Desactivar la cuenta de ${confirmAction?.user?.name}? No podra iniciar sesion.`
          : `¿Reactivar la cuenta de ${confirmAction?.user?.name}?`
        }
        confirmLabel={confirmAction?.user?.status === "active" ? "Desactivar" : "Activar"}
        danger={confirmAction?.user?.status === "active"}
      />

      <AdminConfirmDialog
        open={confirmAction?.type === "delete"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleDeleteUser(confirmAction.user)}
        title="Eliminar usuario"
        message={`¿Eliminar permanentemente a ${confirmAction?.user?.name}? Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </>
  );
}
