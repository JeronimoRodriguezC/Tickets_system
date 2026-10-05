export const STATUS = {
  open: { t: 'Abierto', c: 'bg-red-50 text-red-700' },
  in_progress: { t: 'En proceso', c: 'bg-amber-50 text-amber-700' },
  waiting_user: { t: 'Esperando usuario', c: 'bg-blue-50 text-blue-700' },
  resolved: { t: 'Resuelto', c: 'bg-emerald-50 text-emerald-700' },
  closed: { t: 'Cerrado', c: 'bg-slate-100 text-slate-600' },
};
export const PRIORITY = {
  critical: { t: 'Crítica', c: 'bg-red-600' },
  high: { t: 'Alta', c: 'bg-orange-500' },
  medium: { t: 'Media', c: 'bg-amber-400' },
  low: { t: 'Baja', c: 'bg-emerald-500' },
};
export const IMPACT = [
  ['low', 'Bajo — Solo me afecta a mí'],
  ['medium', 'Medio — Afecta a mi equipo'],
  ['high', 'Alto — Varios usuarios afectados'],
];
export const URGENCY = [
  ['low', 'Baja — Puede esperar días'],
  ['medium', 'Media — Puede esperar unas horas'],
  ['high', 'Alta — Necesito ayuda pronto'],
  ['critical', 'Crítica — Detiene mi operación'],
];
export const fmtDate = (d) =>
  new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
