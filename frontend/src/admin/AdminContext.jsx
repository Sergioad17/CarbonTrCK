import { createContext, useContext } from "react";

const AdminContext = createContext({ navigate: () => {} });

export const AdminProvider = AdminContext.Provider;

export function useAdminNavigate() {
  return useContext(AdminContext).navigate;
}
