import { useEffect, useState } from "react";
import { authApi, getStoredAuth } from "@/lib/api";

export function useAuth() {
  const [session, setSession] = useState(() => getStoredAuth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncSession = () => {
      setSession(getStoredAuth());
      setLoading(false);
    };

    syncSession();
    window.addEventListener("eventful-auth-change", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("eventful-auth-change", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const user = session?.user ?? null;
  const roles = session?.roles ?? [];

  const hasRole = (role) => roles.includes(role);

  const signOut = async () => {
    await authApi.logout();
    setSession(null);
  };

  return { session, user, roles, hasRole, loading, signOut };
}
