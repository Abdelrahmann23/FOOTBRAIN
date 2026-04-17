/**
 * URL for annotated CV output MP4s.
 *
 * In development we always use same-origin `/api/...` so Vite’s proxy serves the file.
 * Using a full `http://localhost:3000/api/...` URL from the Vite app often breaks `<video>`
 * (CORS / cross-origin media loading).
 *
 * In production, use VITE_API_URL when the UI and API are on different origins.
 */
export function buildAnalysisVideoUrl(filename: string): string {
  if (import.meta.env.DEV) {
    return `/api/ai/analysis-output/${encodeURIComponent(filename)}`;
  }
  const raw = import.meta.env.VITE_API_URL || '';
  const base = raw.replace(/\/$/, '');
  if (base.startsWith('http')) {
    return `${base}/ai/analysis-output/${encodeURIComponent(filename)}`;
  }
  return `/api/ai/analysis-output/${encodeURIComponent(filename)}`;
}

export function analysisVideoNeedsCrossOrigin(url: string): boolean {
  return url.startsWith('http');
}
