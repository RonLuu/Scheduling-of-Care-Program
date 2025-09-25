import React from "react";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [me, setMe] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);

  // Rehydrate once on load
  React.useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      setIsReady(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) throw new Error("auth/me failed");
        const data = await res.json();
        setMe(data.user ?? null);
      } catch {
        setMe(null);
        localStorage.removeItem("jwt");
        localStorage.removeItem("jwt_expires_at");
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  // Keep in sync if JWT changes in other tabs
  React.useEffect(() => {
    const refreshFromStorage = async (newJwt) => {
      if (!newJwt) {
        setMe(null);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${newJwt}` },
        });
        if (!res.ok) throw new Error("auth/me failed");
        const data = await res.json();
        setMe(data.user ?? null);
      } catch {
        setMe(null);
      }
    };

    const onStorage = (e) => {
      if (e.key === "jwt") refreshFromStorage(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = React.useMemo(() => ({ me, setMe, isReady }), [me, isReady]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
