// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [me, setMe] = useState(null);

    // ---- Load JWT and fetch user on first render ----
    useEffect(() => {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) return;

        (async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${jwt}` },
                });
                if (!res.ok) throw new Error(`auth/me failed`);
                const data = await res.json();
                setMe(data.user ?? null);
            } catch {
                setMe(null);
            }
        })();
    }, []);

    // ---- React to changes in JWT in other tabs/windows ----
    useEffect(() => {
        const refreshFromStorage = async (newJwt) => {
            if (!newJwt) {
                setMe(null);
                return;
            }
            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${newJwt}` },
                });
                if (!res.ok) throw new Error(`auth/me failed`);
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

    return (
        <AuthContext.Provider value={{ me, setMe }}>
            {children}
        </AuthContext.Provider>
    );
};

// ---- custom hook to use anywhere ----
export const useAuth = () => useContext(AuthContext);
