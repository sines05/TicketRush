const uploadAssets = import.meta.glob('../assets/uploads/**/*.{png,jpg,jpeg,webp,svg,gif}', {
  eager: true,
  import: 'default'
});

const uploadIndex = Object.create(null);

for (const [modulePath, url] of Object.entries(uploadAssets)) {
  const normalizedModulePath = String(modulePath).replace(/\\/g, '/');
  const marker = '/assets/uploads/';
  const idx = normalizedModulePath.lastIndexOf(marker);
  if (idx === -1) continue;

  const relative = normalizedModulePath.slice(idx + marker.length);
  if (!relative) continue;

  // Common formats we might see from DB / older backend upload endpoint.
  uploadIndex[`/uploads/${relative}`] = url;
  uploadIndex[`uploads/${relative}`] = url;

  // Convenience: sometimes code stores just the filename.
  uploadIndex[relative] = url;
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

/**
 * Resolve media URLs for event banners/avatars.
 * - Keeps absolute URLs (http/https), data/blob URLs intact.
 * - Maps '/uploads/<file>' or 'uploads/<file>' to bundled assets under src/assets/uploads.
 */
export function resolveMediaUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  if (isAbsoluteUrl(raw)) {
    try {
      const url = new URL(raw);
      const pathname = url?.pathname || '';
      const cleanPath = stripQueryAndHash(pathname);

      if (uploadIndex[cleanPath]) return uploadIndex[cleanPath];
      if (cleanPath.startsWith('/') && uploadIndex[cleanPath.slice(1)]) return uploadIndex[cleanPath.slice(1)];
    } catch {
      // If URL parsing fails, fall through to return raw.
    }
    return raw;
  }

  const key = stripQueryAndHash(raw);

  // Direct lookup.
  if (uploadIndex[key]) return uploadIndex[key];

  // Normalize leading slash.
  if (key.startsWith('/') && uploadIndex[key.slice(1)]) return uploadIndex[key.slice(1)];
  if (!key.startsWith('/') && uploadIndex[`/${key}`]) return uploadIndex[`/${key}`];

  // Fallback: keep as-is (might be a valid relative path handled elsewhere).
  return raw;
}
