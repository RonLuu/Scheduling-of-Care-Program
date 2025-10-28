import useAuth from "../hooks/useAuth";
import UserProfile from "../Profile/UserProfile";
import NavigationTab from "../../NavigationTab";

function ProfilePage() {
  const { me, setMe } = useAuth();
  const jwt = localStorage.getItem("jwt");

  const logout = () => {
    localStorage.removeItem("jwt");
    setMe(null);
  };

  const refreshMe = async () => {
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
  };

  return (
    <>
      <NavigationTab setMe={setMe} />

      <UserProfile
        me={me}
        setMe={setMe}
        onLogout={logout}
        refreshMe={refreshMe}
        jwt={jwt}
      />
    </>
  );
}

export default ProfilePage;
