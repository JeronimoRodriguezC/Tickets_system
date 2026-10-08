import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, Inbox, Loader, Plus, Search } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { STATUS, PRIORITY, fmtDate } from '../labels';
import { Avatar, PriorityMark, Select, StatusBadge } from '../components/ui';

const DIAS = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['', 'Todo el tiempo']];

export default function Tickets({ mode }) {
  const { user } = useAuth();
  const staff = user.role !== 'requester';
  const title = user.role === 'support' ? 'Tickets asignados' : mode === 'all' ? 'Todos los tickets' : 'Mis tickets';
  const subtitle = user.role === 'support' ? 'Gestiona los tickets que te asignaron.' : mode === 'all' ? 'Todos los tickets del equipo de soporte.' : 'Consulta y gestiona todas tus solicitudes al equipo de soporte IT.';

  const [cats, setCats] = useState([]);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ estado: '', prioridad: '', categoria_id: '', dias: '90', q: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { api('/categories').then(setCats); }, []);
  useEffect(() => {
    const t = setTimeout(() => { setF((s) => ({ ...s, q })); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const upd = (k, v) => { setF((s) => ({ ...s, [k]: v })); setPage(1); };

  useEffect(() => {
    const p = new URLSearchParams({ page });
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    if (mode === 'mine' && user.role === 'admin') p.set('mios', '1');
    api('/tickets?' + p).then((r) => { setRes(r); setErr(''); }).catch((e) => setErr(e.message));
  }, [f, page, mode, user.role]);

  const c = res?.counts || {};
  const cards = [['Total', c.total, Briefcase, 'bg-blue-50 text-blue-600'], ['Abiertos', c.open, Inbox, 'bg-red-50 text-red-600'], ['En proceso', c.in_progress, Loader, 'bg-amber-50 text-amber-600'], ['Resueltos', c.resolved, CheckCircle2, 'bg-emerald-50 text-emerald-600']];
  const tabs = [['', 'Todos', c.total], ['open', 'Abiertos', c.open], ['waiting_user', staff ? 'Esperando usuario' : 'Esperando mi respuesta', c.waiting_user], ['closed', 'Cerrados', c.closed]];
  const cols = ['ID', 'Asunto', 'Categoría', 'Estado', 'Prioridad', 'Última actualización', staff ? 'Solicitante' : null, 'Responsable'].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-semibold">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div>
        {user.role !== 'support' && (
          <Link to="/crear" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} />Crear nuevo ticket</Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, n, Icon, cls]) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className={`grid h-10 w-10 place-items-center rounded-lg ${cls}`}><Icon size={18} /></span>
            <div><div className="text-2xl font-semibold leading-none">{n ?? '–'}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex gap-5 overflow-x-auto border-b border-slate-200 text-sm">
        {tabs.map(([v, label, n]) => (
          <button key={v} onClick={() => upd('estado', v)} className={`whitespace-nowrap border-b-2 pb-3 ${f.estado === v ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-slate-500'}`}>
            {label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs">{n ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-5">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por ID o asunto…" aria-label="Buscar" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <Select aria-label="Estado" value={f.estado} onChange={(e) => upd('estado', e.target.value)} options={[['', 'Estado: Todos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.t])]} />
          <Select aria-label="Prioridad" value={f.prioridad} onChange={(e) => upd('prioridad', e.target.value)} options={[['', 'Prioridad: Todas'], ...Object.entries(PRIORITY).map(([k, v]) => [k, v.t])]} />
          <Select aria-label="Categoría" value={f.categoria_id} onChange={(e) => upd('categoria_id', e.target.value)} options={[['', 'Categoría: Todas'], ...cats.map((x) => [x.id, x.name])]} />
          <Select aria-label="Fecha" value={f.dias} onChange={(e) => upd('dias', e.target.value)} options={DIAS} />
        </div>

        {err && <p role="alert" className="px-4 pb-4 text-sm text-red-600">{err}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>{cols.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {res?.data.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3.5 font-semibold text-blue-700">{t.code}</td>
                  <td className="max-w-xs truncate px-4 py-3.5">{t.subject}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{t.category}</td>
                  <td className="px-4 py-3.5"><StatusBadge s={t.status} /></td>
                  <td className="px-4 py-3.5"><PriorityMark p={t.priority} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{fmtDate(t.updated_at)}</td>
                  {staff && <td className="px-4 py-3.5 text-xs">{t.requester_name}</td>}
                  <td className="px-4 py-3.5">
                    {t.assigned_name ? <span className="flex items-center gap-2 text-xs"><Avatar name={t.assigned_name} />{t.assigned_name}</span> : <span className="text-xs text-slate-400">Sin asignar</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {res && !res.data.length && (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              {c.total ? 'Ningún ticket coincide con estos filtros.' : 'Aún no hay tickets.'}
            </p>
          )}
        </div>

        {res && res.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm text-slate-500">
            <span>Mostrando {(res.page - 1) * 7 + 1}–{Math.min(res.page * 7, res.total)} de {res.total} tickets</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Anterior</button>
              <button disabled={page >= res.pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
