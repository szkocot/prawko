// data.js — JSON data loading with memory cache

const cache = new Map();
const inflight = new Map();

// Media base URL — set to CDN origin for external media hosting
// Falls back to local relative path for development
export const MEDIA_BASE = 'https://f003.backblazeb2.com/file/prawko';

export async function fetchMeta() {
  if (cache.has('meta')) return cache.get('meta');
  if (inflight.has('meta')) return inflight.get('meta');
  const promise = fetch('data/meta.json')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load meta: ${res.status}`);
      return res.json();
    })
    .then(data => {
      cache.set('meta', data);
      return data;
    })
    .finally(() => inflight.delete('meta'));
  inflight.set('meta', promise);
  return promise;
}

export async function fetchCategory(cat) {
  const key = `cat_${cat}`;
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);
  const promise = fetch(`data/${encodeURIComponent(cat)}.json`)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load category ${cat}: ${res.status}`);
      return res.json();
    })
    .then(data => {
      cache.set(key, data);
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}
