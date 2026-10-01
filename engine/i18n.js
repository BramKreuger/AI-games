// Tekstopzoeking: pack-overrides > game-defaults (taal) > game-defaults (nl) > sleutel zelf.
export function createT({ lang = 'nl', defaults = {}, pack = {} }) {
  const packTexts = pack.texts?.[lang] ?? {};
  const get = (k) => packTexts[k] ?? defaults[lang]?.[k] ?? defaults.nl?.[k] ?? k;
  return (key, vars = {}) =>
    get(key).replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? `{${v}}`));
}
