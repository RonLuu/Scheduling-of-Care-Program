import React from "react";
import LogIn from "./components/login/LogIn";
import Register from "./components/register/Register";
import Dashboard from "./components/dashboard/Dashboard";

// ---- custom hook (define OUTSIDE component) ----
function useAuth() {
  const [me, setMe] = React.useState(null);

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
        setMe(data.user ?? null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  // react to jwt changes from other tabs/windows
  React.useEffect(() => {
    async function refreshFromStorage(newJwt) {
      if (!newJwt) {
        setMe(null);
        return;
      }
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${newJwt}` },
        });
        if (!res.ok) throw new Error(`auth/me ${res.status}`);
        const data = await res.json();
        setMe(data.user ?? null);
      } catch {
        setMe(null);
      }
    }

    function onStorage(e) {
      if (e.key === "jwt") refreshFromStorage(e.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [me, setMe];
}

export default function App() {
  const [me, setMe] = useAuth();
  const [page, setPage] = React.useState("login");

  // if authenticated later, auto-go to dashboard
  React.useEffect(() => {
    if (me) setPage("dashboard");
  }, [me]);

  function onAuthed(userWithJwt) {
    setMe(userWithJwt);
    localStorage.setItem("jwt", userWithJwt.jwt);
    setPage("dashboard");
  }

  function logout() {
    localStorage.removeItem("jwt");
    setMe(null);
    setPage("login");
  }

  async function refreshMe() {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) return setMe(null);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMe(data.user ?? null);
    } catch {
      setMe(null);
    }
  }

  // ---- render a React nav  ----
  return (
    <>
      <nav className="navbar">
        {!me ? (
          <>
            <button onClick={() => setPage("login")} id="nav-login">
              Log in
            </button>
            <button onClick={() => setPage("register")} id="nav-register">
              Register
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setPage("dashboard")} id="nav-dashboard">
              Dashboard
            </button>
            <button onClick={logout}>Log out</button>
          </>
        )}
      </nav>

      {!me && page === "login" && <LogIn onAuthed={onAuthed} />}
      {!me && page === "register" && <Register onAuthed={onAuthed} />}

      {me && page === "dashboard" && (
        <Dashboard me={me} onLogout={logout} refreshMe={refreshMe} />
      )}

      {/* {!me && page === "dashboard" && (
        <div className="card">
          <p>Please login first.</p>
        </div>
      )} */}
    </>
  );
}
