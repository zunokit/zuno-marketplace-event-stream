import {
  encodeCursor,
  decodeCursor,
  compareEvents,
  paginateWithCursor,
  type PageableEvent,
} from "../cursor-pagination";

function ev(block: number, logIndex: number, extra: Record<string, unknown> = {}): PageableEvent {
  return { blockNumber: block, logIndex, ...extra };
}

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a (block, logIndex) pair through base64url", () => {
    const c = encodeCursor(123456, 7);
    const decoded = decodeCursor(c);
    expect(decoded).toEqual({ b: 123456, i: 7 });
  });

  it("returns null for missing / malformed input", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not-base64-payload!!")).toBeNull();
    expect(decodeCursor(Buffer.from("not json", "utf8").toString("base64url"))).toBeNull();
  });

  it("returns null for cursors from a future version", () => {
    const futurePayload = Buffer.from(
      JSON.stringify({ v: 999, b: 1, i: 0 }),
      "utf8",
    ).toString("base64url");
    expect(decodeCursor(futurePayload)).toBeNull();
  });

  it("rejects negative or non-integer logIndex", () => {
    expect(() => encodeCursor(1, -1)).toThrow(/non-negative integer/);
    expect(() => encodeCursor(1, 1.5)).toThrow(/non-negative integer/);
  });

  it("accepts bigint block numbers within safe range", () => {
    const c = encodeCursor(BigInt(1_000_000), 3);
    expect(decodeCursor(c)).toEqual({ b: 1_000_000, i: 3 });
  });

  it("throws on bigint block numbers outside safe integer range", () => {
    expect(() => encodeCursor(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 0)).toThrow(
      /MAX_SAFE_INTEGER/,
    );
  });
});

describe("compareEvents", () => {
  it("sorts by block then logIndex ascending", () => {
    const arr = [ev(2, 5), ev(1, 9), ev(2, 0), ev(1, 0)];
    arr.sort(compareEvents);
    expect(arr.map((e) => [e.blockNumber, e.logIndex])).toEqual([
      [1, 0],
      [1, 9],
      [2, 0],
      [2, 5],
    ]);
  });
});

describe("paginateWithCursor", () => {
  // newest first: block 10 > 9 > … > 1
  const events = Array.from({ length: 25 }, (_, idx) => ev(25 - idx, 0, { idx }));

  it("returns the first page when no cursor is supplied", () => {
    const result = paginateWithCursor(events, { limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toMatchObject({ blockNumber: 25 });
    expect(result.items[4]).toMatchObject({ blockNumber: 21 });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it("returns the next page when the cursor is supplied", () => {
    const first = paginateWithCursor(events, { limit: 5 });
    const second = paginateWithCursor(events, {
      limit: 5,
      cursor: first.nextCursor,
    });
    expect(second.items[0]).toMatchObject({ blockNumber: 20 });
    expect(second.items[4]).toMatchObject({ blockNumber: 16 });
    expect(second.hasMore).toBe(true);
  });

  it("sets hasMore=false + nextCursor=null on the last page", () => {
    // 25 events at limit=10 → 3 pages (10, 10, 5)
    const p1 = paginateWithCursor(events, { limit: 10 });
    const p2 = paginateWithCursor(events, { limit: 10, cursor: p1.nextCursor });
    const p3 = paginateWithCursor(events, { limit: 10, cursor: p2.nextCursor });
    expect(p3.items).toHaveLength(5);
    expect(p3.hasMore).toBe(false);
    expect(p3.nextCursor).toBeNull();
  });

  it("returns empty page when cursor is past the end", () => {
    const last = events[events.length - 1];
    const cursor = encodeCursor(last.blockNumber, last.logIndex);
    const result = paginateWithCursor(events, { cursor, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("clamps the requested limit into [1, 200]", () => {
    const a = paginateWithCursor(events, { limit: 0 });
    const b = paginateWithCursor(events, { limit: 9999 });
    expect(a.items.length).toBe(1);
    expect(b.items.length).toBe(events.length);
  });

  it("handles multiple events in the same block ordered by logIndex", () => {
    const multi = [
      ev(10, 5),
      ev(10, 3),
      ev(10, 1),
      ev(9, 9),
      ev(9, 0),
    ];
    const p1 = paginateWithCursor(multi, { limit: 3 });
    expect(p1.items.map((e) => [e.blockNumber, e.logIndex])).toEqual([
      [10, 5],
      [10, 3],
      [10, 1],
    ]);
    const p2 = paginateWithCursor(multi, { limit: 3, cursor: p1.nextCursor });
    expect(p2.items.map((e) => [e.blockNumber, e.logIndex])).toEqual([
      [9, 9],
      [9, 0],
    ]);
    expect(p2.hasMore).toBe(false);
  });

  it("treats unknown cursors as 'start from beginning'", () => {
    const result = paginateWithCursor(events, {
      cursor: "this-is-not-a-real-cursor",
      limit: 3,
    });
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({ blockNumber: 25 });
  });
});
