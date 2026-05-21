/**
 * Cursor-based pagination over an in-memory ordered list of events.
 *
 * Why cursors instead of offsets:
 *  - The event feed is append-friendly; an offset-based page jumps if
 *    new events arrive at the head between calls.
 *  - The cursor encodes the *position* (block + log index) of the last
 *    item from the previous page, so we can resume deterministically.
 *  - Cursors are opaque base64-encoded JSON. Callers should treat them
 *    as black boxes; this keeps the wire format forward-compatible.
 *
 * The helpers in this module are pure — no fetch, no DOM, no env —
 * which makes them trivially unit-testable. The SSE / REST layer is
 * responsible for materializing an array of events; this module is
 * responsible for slicing it into pages.
 */

const CURSOR_VERSION = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

export interface PageableEvent {
  blockNumber: number | bigint;
  logIndex: number;
  // Allow callers to carry whatever extra fields they like.
  [key: string]: unknown;
}

export interface PaginationCursor {
  /** Block number of the last returned item. */
  b: number;
  /** Log index of the last returned item. */
  i: number;
}

export interface PaginateOptions {
  /** Cursor returned by a previous call. Null/undefined for first page. */
  cursor?: string | null;
  /** Page size; clamped into [1, MAX_LIMIT]. Default 20. */
  limit?: number;
}

export interface PaginateResult<T> {
  items: T[];
  /** Cursor for the next page, or null when there are no more items. */
  nextCursor: string | null;
  /** Was the requested limit hit? Useful for UI 'load more' affordance. */
  hasMore: boolean;
}

function toNumber(value: number | bigint): number {
  if (typeof value === "number") return value;
  if (value > Number.MAX_SAFE_INTEGER) {
    // Block numbers will fit in a safe int for the foreseeable future;
    // we still surface this as a clear error rather than silently
    // losing precision.
    throw new Error(
      `cursor-pagination: bigint ${value.toString()} exceeds Number.MAX_SAFE_INTEGER`,
    );
  }
  return Number(value);
}

/**
 * Encodes a `(blockNumber, logIndex)` position into an opaque cursor.
 * The output is URL-safe base64 of a tiny versioned JSON object.
 */
export function encodeCursor(
  blockNumber: number | bigint,
  logIndex: number,
): string {
  if (!Number.isInteger(logIndex) || logIndex < 0) {
    throw new Error("encodeCursor: logIndex must be a non-negative integer");
  }
  const payload: PaginationCursor & { v: number } = {
    v: CURSOR_VERSION,
    b: toNumber(blockNumber),
    i: logIndex,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Decodes an opaque cursor produced by `encodeCursor`. Returns `null`
 * if the input is missing, malformed, or from a future cursor version
 * we don't know how to read.
 */
export function decodeCursor(cursor: string | null | undefined): PaginationCursor | null {
  if (!cursor) return null;
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<{ v: number; b: number; i: number }>;
    if (
      parsed.v !== CURSOR_VERSION ||
      typeof parsed.b !== "number" ||
      typeof parsed.i !== "number" ||
      !Number.isFinite(parsed.b) ||
      !Number.isInteger(parsed.i)
    ) {
      return null;
    }
    return { b: parsed.b, i: parsed.i };
  } catch {
    return null;
  }
}

/**
 * Lexicographic compare on (blockNumber, logIndex). Returns positive
 * when `a` is *after* `b` in chronological order (higher block, or
 * same block but higher logIndex).
 */
export function compareEvents(a: PageableEvent, b: PageableEvent): number {
  const ab = toNumber(a.blockNumber);
  const bb = toNumber(b.blockNumber);
  if (ab !== bb) return ab - bb;
  return a.logIndex - b.logIndex;
}

/**
 * Slices an *already-sorted* array (descending chronological order —
 * newest first) into a page starting after the given cursor.
 *
 * If the input is not sorted, behavior is undefined; callers can use
 * `compareEvents` to sort first.
 */
export function paginateWithCursor<T extends PageableEvent>(
  events: readonly T[],
  options: PaginateOptions = {},
): PaginateResult<T> {
  const requested = options.limit ?? DEFAULT_LIMIT;
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(requested)));
  const cursor = decodeCursor(options.cursor);

  let startIndex = 0;
  if (cursor) {
    // Find the first event strictly older than (b, i). Because the
    // input is newest-first, "older than the cursor" means a smaller
    // (blockNumber, logIndex) tuple.
    startIndex = events.findIndex(
      (e) =>
        toNumber(e.blockNumber) < cursor.b ||
        (toNumber(e.blockNumber) === cursor.b && e.logIndex < cursor.i),
    );
    if (startIndex === -1) {
      return { items: [], nextCursor: null, hasMore: false };
    }
  }

  const page = events.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < events.length;
  const tail = page[page.length - 1];
  const nextCursor =
    hasMore && tail ? encodeCursor(tail.blockNumber, tail.logIndex) : null;

  return { items: page as T[], nextCursor, hasMore };
}
