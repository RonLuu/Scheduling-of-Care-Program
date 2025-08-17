import { useEffect, useState } from 'react'
import { getMyTasks, completeOccurrence } from './api'
import { me, logout } from './auth'
import { useNavigate } from 'react-router-dom'

type Task = {
  occurrence_id: number
  due_on: string
  status: 'DUE'|'OVERDUE'|'COMPLETED'|'SKIPPED'
  title: string
  category: string | null
  person: string
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // UI state for the textbox and the active window
  const [daysInput, setDaysInput] = useState<string>('200') // textbox value
  const [activeDays, setActiveDays] = useState<number>(200) // currently applied window

  const nav = useNavigate()

  // initial auth + first load
  useEffect(() => {
    (async () => {
      try {
        const r = await me()
        if (!r.user) { nav('/login'); return }
        setUser(r.user)
        const rows = await getMyTasks(activeDays)
        setTasks(rows)
      } catch (e:any) {
        setErr(String(e?.message ?? e))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // re-load when activeDays changes (after clicking "Load" or pressing Enter)
  useEffect(() => {
    if (!user) return
    setLoading(true)
    getMyTasks(activeDays)
      .then(setTasks)
      .catch(e => setErr(String(e?.message ?? e)))
      .finally(() => setLoading(false))
  }, [activeDays, user])

  async function onComplete(id: number) {
    await completeOccurrence(id, 'Done via UI')
    setTasks(prev => prev.filter(t => t.occurrence_id !== id))
  }

  async function onLogout() {
    await logout()
    nav('/login')
  }

  function applyDays() {
    const n = Number(daysInput)
    if (!Number.isFinite(n) || n < 0) return // ignore invalid
    setActiveDays(n)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') applyDays()
  }

  if (loading) return <p style={{padding:20}}>Loading…</p>
  if (err)     return <p style={{padding:20, color:'crimson'}}>Error: {err}</p>

  return (
    <div style={{maxWidth: 760, margin: '2rem auto', padding: '0 1rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
        <h2 style={{margin:0}}>My Tasks (next {activeDays} days)</h2>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <label>Days:&nbsp;
            <input
              type="number"
              min={0}
              value={daysInput}
              onChange={e=>setDaysInput(e.target.value)}
              onKeyDown={onKeyDown}
              style={{width:90, padding:'6px 8px'}}
            />
          </label>
          <button onClick={applyDays}>Load</button>
          <span style={{marginLeft:12}}>{user?.name} ({user?.role})</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p style={{marginTop:16}}>No tasks due in the next {activeDays} days.</p>
      ) : (
        <ul style={{listStyle:'none', padding:0, marginTop:16}}>
          {tasks.map(t => (
            <li key={t.occurrence_id}
                style={{display:'flex', gap:12, alignItems:'center', padding:'10px 0', borderBottom:'1px solid #eee'}}>
              <span style={{minWidth:110}}>{new Date(t.due_on).toLocaleDateString()}</span>
              <span style={{flex:1}}>{t.title} — <em>{t.person}</em></span>
              <button onClick={() => onComplete(t.occurrence_id)}>Mark done</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}