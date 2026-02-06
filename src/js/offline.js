// offline.js — Offline download management

import { fetchCategory, MEDIA_BASE } from './data.js';

const DOWNLOAD_KEY = 'prawko_offline';

export function getDownloadedCategories() {
  try {
    const data = JSON.parse(localStorage.getItem(DOWNLOAD_KEY));
    return Array.isArray(data) ? new Set(data) : new Set();
  } catch {
    return new Set();
  }
}

function saveDownloaded(set) {
  try { localStorage.setItem(DOWNLOAD_KEY, JSON.stringify([...set])); } catch {}
}

export async function downloadCategoryMedia(categoryId, onProgress) {
  const data = await fetchCategory(categoryId);
  const seen = new Set();
  const mediaUrls = [];

  for (const q of data.questions) {
    if (!q.media || seen.has(q.media)) continue;
    seen.add(q.media);
    const prefix = q.mediaType === 'video' ? 'vid' : 'img';
    mediaUrls.push(`${MEDIA_BASE}/${prefix}/${encodeURIComponent(q.media)}`);
  }

  const total = mediaUrls.length;
  if (total === 0) {
    const downloaded = getDownloadedCategories();
    downloaded.add(categoryId);
    saveDownloaded(downloaded);
    onProgress?.(1, 1);
    return;
  }

  let completed = 0;
  const BATCH = 6;

  for (let i = 0; i < mediaUrls.length; i += BATCH) {
    const batch = mediaUrls.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (url) => {
      try { await fetch(url); } catch {}
      completed++;
      onProgress?.(completed, total);
    }));
  }

  const downloaded = getDownloadedCategories();
  downloaded.add(categoryId);
  saveDownloaded(downloaded);
}
