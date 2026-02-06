// data.js — JSON data loading with memory cache

const cache = new Map();

// Media base URL — set to CDN origin for external media hosting
// Falls back to local relative path for development
export const MEDIA_BASE = 'https://f003.backblazeb2.com/file/prawko';

export async function fetchMeta() {
  if (cache.has('meta')) return cache.get('meta');
  const res = await fetch('data/meta.json');
  if (!res.ok) throw new Error(`Failed to load meta: ${res.status}`);
  const data = await res.json();
  cache.set('meta', data);
  return data;
}

export async function fetchCategory(cat) {
  const key = `cat_${cat}`;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(`data/${encodeURIComponent(cat)}.json`);
  if (!res.ok) throw new Error(`Failed to load category ${cat}: ${res.status}`);
  const data = await res.json();
  cache.set(key, data);
  return data;
}
