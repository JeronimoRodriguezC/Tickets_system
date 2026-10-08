import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, Send, X } from 'lucide-react';
import { api } from '../api';
import { IMPACT, URGENCY } from '../labels';
import { Field, Input, Select, Textarea } from '../components/ui';

const TIMES = [['Crítica', 'bg-red-600', '15-30 min'], ['Alta', 'bg-orange-500', '1-2 horas'], ['Media', 'bg-amber-400', '4-8 horas'], ['Baja', 'bg-emerald-500', '1-2 días']];

export default function CreateTicket() {
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [supports, setSupports] = useState(null);
  const [f, setF] = useState({ subject: '', category_id: '', impact: '', priority: '', assigned_to: '', description: '', notify_email: true });
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => { api('/categories').then(setCats); }, []);

  // Al cambiar la categoría se recarga la lista de soporte especializado
  useEffect(() => {
    set('assigned_to', ''); setSupports(null);
    if (!f.category_id) return;
    api(`/support-users?category_id=${f.category_id}`).then((r) => {
      setSupports(r);
      if (r.length === 1) set('assigned_to', String(r[0].id));
    });
  }, [f.category_id]);

  const noSupport = supports && supports.length === 0;
  const addFiles = (list) => setFiles((s) => [...s, ...Array.from(list)].slice(0, 5));

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      files.forEach((x) => fd.append('files', x));
      await api('/tickets', { method: 'POST', form: fd });
      nav('/mis-tickets');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-xl font-semibold">Crear nuevo ticket</h2>
          <p className="text-sm text-slate-500">Describe el problema con detalle para que podamos ayudarte más rápido.</p>
        </div>
        <Field label="Asunto" hint="Resume el problema en una frase clara.">
          <Input required maxLength={200} value={f.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Ej: No puedo acceder a SAP desde la red corporativa" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">
            <Select required placeholder="Selecciona una categoría" value={f.category_id} onChange={(e) => set('category_id', e.target.value)} options={cats.map((c) => [c.id, c.name])} />
          </Field>
          <Field label="Impacto">
            <Select required placeholder="Selecciona el impacto" value={f.impact} onChange={(e) => set('impact', e.target.value)} options={IMPACT} />
          </Field>
          <Field label="Urgencia">
            <Select required placeholder="Selecciona la urgencia" value={f.priority} onChange={(e) => set('priority', e.target.value)} options={URGENCY} />
          </Field>
          <Field label="Asignado a">
            <Select required disabled={!f.category_id || !supports?.length}
              placeholder={!f.category_id ? 'Primero elige una categoría' : supports === null ? 'Cargando…' : noSupport ? 'Sin soporte disponible' : 'Selecciona una persona'}
              value={f.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} options={(supports || []).map((s) => [s.id, s.name])} />
          </Field>
        </div>
        {noSupport && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay soporte disponible para esta categoría. Pide al administrador que asigne a alguien.</p>}
        <Field label="Descripción" hint="No incluyas contraseñas ni datos confidenciales.">
          <Textarea required rows={5} maxLength={2000} value={f.description} onChange={(e) => set('description', e.target.value)} />
          <span className="block text-right text-xs text-slate-400">{f.description.length} / 2.000</span>
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Adjuntos · opcional</span>
          <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:bg-slate-50">
            <CloudUpload className="text-blue-600" />
            <span className="text-sm font-medium">Arrastra archivos aquí o selecciónalos</span>
            <span className="text-xs text-slate-500">PNG, JPG, PDF o TXT · Máximo 10 MB por archivo · Hasta 5</span>
            <input type="file" multiple hidden accept=".png,.jpg,.jpeg,.pdf,.txt" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((x, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="truncate">{x.name}</span>
                  <button type="button" aria-label={`Quitar ${x.name}`} onClick={() => setFiles((s) => s.filter((_, j) => j !== i))}><X size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.notify_email} onChange={(e) => set('notify_email', e.target.checked)} /> Notificarme por correo sobre cambios
          </label>
          <button disabled={busy || noSupport} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            <Send size={16} />{busy ? 'Enviando…' : 'Enviar ticket'}
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">Tiempos estimados</h3>
          <p className="mb-3 text-xs text-slate-500">Primera respuesta según prioridad</p>
          <ul className="space-y-2 text-sm">
            {TIMES.map(([n, c, t]) => <li key={n} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${c}`} />{n}</span><span className="text-slate-500">{t}</span></li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm">
          <h3 className="mb-2 font-semibold">Antes de enviar</h3>
          <ul className="list-disc space-y-1 pl-4 text-slate-600">
            <li>Incluye el mensaje de error exacto.</li>
            <li>Indica cuándo comenzó el problema.</li>
            <li>Adjunta una captura si es posible.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
