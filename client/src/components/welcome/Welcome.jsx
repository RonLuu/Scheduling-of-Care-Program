import React from 'react'
import { Link } from 'react-router-dom';
import "../../styles/Welcome.css"
// ---- custom hook (define OUTSIDE component) ----
function useAuth() {
    const [status, setStatus] = React.useState(null);
    // initial load: try JWT from localStorage
    React.useEffect(() => {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) return;

        (async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${jwt}` },
                });
                if (!res.ok) throw new Error(`auth/me ${res.status}`);
                const data = await res.json();
                setStatus(data.user ?? null);
            } catch {
                setStatus(null);
            }
        })();
    }, []);

    // react to jwt changes from other tabs/windows
    React.useEffect(() => {
        async function refreshFromStorage(newJwt) {
            if (!newJwt) {
                setStatus(null);
                return;
            }
            try {
                const res = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${newJwt}` },
                });
                if (!res.ok) throw new Error(`auth/me ${res.status}`);
                const data = await res.json();
                setStatus(data.user ?? null);
            } catch {
                setStatus(null);
            }
        }

        function onStorage(e) {
            if (e.key === "jwt") refreshFromStorage(e.newValue);
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    return [status, setStatus];
}

const Welcome = () => {
    // Status for whether the user logged in
    const [status, setStatus] = useAuth();
    
    React.useEffect(() => {
        if (status)
        {
            return (<Link to='/dashboard'/>)
        }
    }, [status]);

    function onAuthed(userWithJwt) {
        setMe(userWithJwt);
        localStorage.setItem("jwt", userWithJwt.jwt);
        setPage("dashboard");
    }

    function logout() {
        localStorage.removeItem("jwt");
        setStatus(null);
    }

    async function refreshStatus() {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) return setStatus(null);
        try {
            const res = await fetch("/api/auth/me", {
                headers: { Authorization: `Bearer ${jwt}` },
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setStatus(data.user ?? null);
        } catch {
            setStatus(null);
        }
    }

    // ---- render a React nav  ----
    return (
        <>
            {!status ? (
                <div className='button-wrapper'>
                    <Link to='/login'>
                        <button id="nav-login">
                            Login
                        </button>
                    </Link>
                    <Link to='/registeruser'>
                        <button id="nav-register">
                            Register
                        </button>
                    </Link>
                </div>
            ) : (
                <>
                    <Link to='/dashboard'/>
                </>
            )}
        </>
    );
}

export default Welcome