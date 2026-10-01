export const ENGINE_VERSION = '1.1.0';

// Minimale semver-range check: ^x.y.z, x.y.z of x.x
export function satisfies(version, range) {
  const [M, m, p] = version.split('.').map(Number);
  const r = range.replace(/^[\^~]/, '').split('.').map(Number);
  if (range.startsWith('^')) {
    return M === r[0] && (m > (r[1] ?? 0) || (m === (r[1] ?? 0) && p >= (r[2] ?? 0)));
  }
  return M === r[0] && m === (r[1] ?? m) && p === (r[2] ?? p);
}
