import { useState } from 'react';
import { login, signup } from '../auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin2@example.com'); // demo
  const [password, setPassword] = useState('password');     // demo
  const [role, setRole] = useState<'ADMIN'|'STAFF'|'READONLY'>('STAFF');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'signup') {
        await signup(name, email, password, role);
      }
      await login(email, password);
      nav('/app'); // go to main page
    } catch (e: any) {
      setErr(e.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{maxWidth:420, margin:'3rem auto'}}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      <form onSubmit={onSubmit} style={{display:'grid', gap:12}}>
        {mode === 'signup' && (
          <>
            <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
            <select value={role} onChange={e=>setRole(e.target.value as any)}>
              <option value="ADMIN">ADMIN</option>
              <option value="STAFF">STAFF</option>
              <option value="READONLY">READONLY</option>
            </select>
          </>
        )}
        <input placeholder="Email" onChange={e=>setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" onChange={e=>setPassword(e.target.value)} required />
        {err && <div style={{color:'crimson'}}>{err}</div>}
        <button disabled={busy} type="submit">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p style={{marginTop:12}}>
        {mode === 'login'
          ? <>No account? <button onClick={()=>setMode('signup')}>Sign up</button></>
          : <>Have an account? <button onClick={()=>setMode('login')}>Sign in</button></>}
      </p>
    </div>
  );
}