// Eenvoudige moderatie voor tekst die naar het grote scherm kan. Pakketten kunnen extra termen toevoegen.
const BASE = ['kut', 'kanker', 'fuck', 'shit', 'nazi', 'hoer', 'neger', 'tering'];

export function createModerator(extra = []) {
  const words = [...BASE, ...extra].map((w) => w.toLowerCase());
  const norm = (s) => String(s).toLowerCase()
    .replace(/[@4]/g, 'a').replace(/[3]/g, 'e').replace(/[1!]/g, 'i').replace(/0/g, 'o').replace(/\$/g, 's')
    .replace(/[^a-zà-ÿ\s]/g, '');
  return {
    check(text) {
      const n = norm(text);
      const squeezed = n.replace(/\s+/g, '');
      const hit = words.find((w) => n.includes(w) || squeezed.includes(w));
      return hit ? { ok: false, reason: 'blocked' } : { ok: true };
    },
    // Geeft veilige tekst voor het grote scherm.
    clean(text, placeholder = '***') {
      return this.check(text).ok ? String(text) : placeholder;
    },
  };
}
