import React from "react";

// Fetch all clients (persons) linked to a user, with relationshipType merged in.
async function fetchClientsForUser(userId, jwt, { signal } = {}) {
  if (!userId || !jwt) return [];

  const headers = { Authorization: `Bearer ${jwt}` };

  // 1) get links for this user
  const linksRes = await fetch(`/api/person-user-links?userId=${userId}`, {
    headers,
    signal,
  });
  if (!linksRes.ok) throw new Error("Failed to load client links");
  const links = await linksRes.json();

  // 2) fetch each person and merge the relationship type
  const persons = await Promise.all(
    links.map(async (l) => {
      const personRes = await fetch(`/api/person-with-needs/${l.personId}`, {
        headers,
        signal,
      });
      if (!personRes.ok) throw new Error("Failed to load a client");
      const p = await personRes.json();
      return { ...p, relationshipType: l.relationshipType };
    })
  );

  return persons;
}

export function useClients(me, jwt) {
  const [clients, setClients] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(
    async (signal) => {
      if (!me || !jwt) return;
      setLoading(true);
      setError("");
      try {
        const persons = await fetchClientsForUser(me.id, jwt, { signal });
        setClients(persons);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [me, jwt]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { clients, loading, error, refresh: () => load() };
}
