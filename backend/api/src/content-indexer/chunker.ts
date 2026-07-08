/**
 * Lightweight character-based chunker. Avoids tiktoken; designed for short
 * lesson bodies (< 50 KB). Keeps chunks paragraph-friendly when possible.
 */

const DEFAULT_CHUNK_SIZE = 700;
const DEFAULT_OVERLAP = 100;

export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(
  input: string | null | undefined,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): TextChunk[] {
  const text = (input ?? '').trim();
  if (!text) return [];
  if (text.length <= chunkSize) return [{ text, index: 0 }];

  const chunks: TextChunk[] = [];
  let start = 0;
  let idx = 0;
  const minStartGain = 1; // never make zero progress
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const candidates = ['\n\n', '. ', '! ', '? ', '\n'];
      for (const sep of candidates) {
        const lastSep = text.lastIndexOf(sep, end);
        if (lastSep > start + chunkSize / 2) {
          end = lastSep + sep.length;
          break;
        }
      }
    }
    const slice = text.slice(start, end).trim();
    if (slice) chunks.push({ text: slice, index: idx++ });
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + minStartGain);
  }
  return chunks;
}
