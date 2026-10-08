import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { useAuth } from '../auth';
import { Field, Input } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav('/mis-tickets', { replace: true }); }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#0f2342] p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-600 text-white"><Headphones size={20} /></span>
          <div><h1 className="font-semibold">IT Service Desk</h1><p className="text-xs text-slate-500">Inicia sesión para continuar</p></div>
        </div>
        <Field label="Correo"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Contraseña"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}
