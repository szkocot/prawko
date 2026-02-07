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

let activeController = null;

export function cancelDownload() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

export async function downloadCategoryMedia(categoryId, onProgress) {
  cancelDownload();
  const controller = new AbortController();
  activeController = controller;

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
    activeController = null;
    onProgress?.(1, 1);
    return { success: true, total: 0, failed: 0, cancelled: false };
  }

  let completed = 0;
  let failed = 0;
  let cancelled = false;
  const BATCH = 6;

  for (let i = 0; i < mediaUrls.length; i += BATCH) {
    if (controller.signal.aborted) {
      cancelled = true;
      break;
    }

    const batch = mediaUrls.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(async (url) => {
      await fetch(url, { mode: 'no-cors', signal: controller.signal });
    }));

    for (const r of results) {
      if (r.status === 'fulfilled') {
        completed++;
      } else if (r.reason?.name === 'AbortError') {
        cancelled = true;
      } else {
        failed++;
        completed++;
      }
    }

    onProgress?.(completed, total, { failed, cancelled });

    if (cancelled) break;
  }

  if (activeController === controller) {
    activeController = null;
  }

  if (!cancelled && failed === 0) {
    const downloaded = getDownloadedCategories();
    downloaded.add(categoryId);
    saveDownloaded(downloaded);
  }

  return { success: !cancelled && failed === 0, total, failed, cancelled };
}
