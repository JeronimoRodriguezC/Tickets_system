import { STATUS, PRIORITY } from '../labels';

const base = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400';

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
  </label>
);
export const Input = (p) => <input {...p} className={base} />;
export const Textarea = (p) => <textarea {...p} className={base + ' resize-y'} />;
export const Select = ({ placeholder, options, ...p }) => (
  <select {...p} className={base}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
  </select>
);

export const Avatar = ({ name = '', size = 'h-7 w-7' }) => (
  <span className={`${size} grid shrink-0 place-items-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700`}>
    {name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
  </span>
);
export const StatusBadge = ({ s }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS[s].c}`}>{STATUS[s].t}</span>
);
export const PriorityMark = ({ p }) => (
  <span className="flex items-center gap-2 text-xs"><i className={`h-4 w-0.5 rounded ${PRIORITY[p].c}`} />{PRIORITY[p].t}</span>
);
