import { NavLink, Outlet } from 'react-router-dom';
import { Headphones, ListChecks, LogOut, PlusCircle, Ticket } from 'lucide-react';
import { useAuth } from '../auth';
import { Avatar } from './ui';

const ROLE = { admin: 'Administrador', requester: 'Solicitante', support: 'Soporte' };

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = [
    ['requester', 'admin'].includes(user.role) && ['/crear', 'Crear ticket', PlusCircle],
    ['/mis-tickets', user.role === 'support' ? 'Tickets asignados' : 'Mis tickets', Ticket],
    user.role === 'admin' && ['/todos', 'Todos los tickets', ListChecks],
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[#0f2342] p-4 text-slate-300 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600"><Headphones size={18} /></span>
          <div className="leading-tight"><div className="font-semibold">IT Service Desk</div><div className="text-xs text-slate-400">Uso interno</div></div>
        </div>
        <nav className="space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div><div className="text-xs text-slate-500">Portal de soporte</div><div className="text-lg font-semibold">Centro de soporte IT</div></div>
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="h-9 w-9" />
            <div className="hidden text-sm leading-tight sm:block"><div className="font-medium">{user.name}</div><div className="text-xs text-slate-500">{ROLE[user.role]}</div></div>
            <button onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><LogOut size={18} /></button>
          </div>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 md:hidden">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>{label}</NavLink>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
