export const getToken = () => localStorage.getItem('token');

// form: FormData (para subir archivos); body: objeto JSON
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  const res = await fetch('/api' + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) { localStorage.removeItem('token'); location.href = '/login'; }
    throw new Error(data.error || 'Error inesperado');
  }
  return data;
}
