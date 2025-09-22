import { useEffect, useState } from "react";
export default function useAuth() {
    const [me, setMe] = useState(null);

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

    return { me, setMe };
}