// Gedeelde helpers voor telefoon, scherm en dashboard.
window.UI = null;
window.loadUI = async (lang) => { const ui = await (await fetch('/web/ui.json')).json(); window.UI = ui[lang] ?? ui.nl; return window.UI; };
window.api = async (path, opts) => { const r = await fetch(path, opts); return r.json(); };
window.post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });
window.esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
