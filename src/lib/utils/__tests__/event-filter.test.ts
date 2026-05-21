import {
  countByCategory,
  filterEvents,
  groupEventsByCategory,
  hasActiveFilter,
  matchesEvent,
} from "../event-filter";
import { type PonderEvent } from "@/lib/services/ponder-client";

function makeEvent(overrides: Partial<PonderEvent> = {}): PonderEvent {
  return {
    id: "0xabc:1",
    eventType: "nft_purchased",
    category: "trade",
    actor: "0x1111111111111111111111111111111111111111",
    counterparty: "0x2222222222222222222222222222222222222222",
    collection: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    tokenId: "42",
    data: {},
    contractAddress: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    contractName: "NFTExchange",
    blockNumber: "100",
    blockTimestamp: "1700000000",
    transactionHash:
      "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    logIndex: 1,
    chainId: 1,
    processedAt: "2025-01-15T00:00:00Z",
    version: "1",
    ...overrides,
  };
}

const trade = makeEvent({ id: "trade", category: "trade", eventType: "nft_purchased" });
const auction = makeEvent({ id: "auction", category: "auction", eventType: "auction_settled" });
const offer = makeEvent({ id: "offer", category: "offer", eventType: "offer_accepted" });
const mintFresh = makeEvent({
  id: "mint-fresh",
  category: "mint",
  eventType: "nft_minted",
  blockTimestamp: "1700000300",
});
const listing = makeEvent({
  id: "listing",
  category: "listing",
  eventType: "listing_created",
  collection: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  actor: "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD",
  blockTimestamp: "1699999000",
});

const sample = [trade, auction, offer, mintFresh, listing];

describe("matchesEvent", () => {
  it("passes when no filter is applied", () => {
    expect(matchesEvent(trade, {})).toBe(true);
  });

  it("filters by categories", () => {
    expect(matchesEvent(trade, { categories: ["trade"] })).toBe(true);
    expect(matchesEvent(auction, { categories: ["trade", "offer"] })).toBe(false);
  });

  it("treats empty categories array as wildcard", () => {
    expect(matchesEvent(trade, { categories: [] })).toBe(true);
  });

  it("filters by eventTypes", () => {
    expect(matchesEvent(trade, { eventTypes: ["nft_purchased"] })).toBe(true);
    expect(matchesEvent(trade, { eventTypes: ["auction_settled"] })).toBe(false);
  });

  it("filters by collection case-insensitively", () => {
    expect(
      matchesEvent(listing, {
        collection: "0xcccccccccccccccccccccccccccccccccccccccc",
      }),
    ).toBe(true);
    expect(
      matchesEvent(listing, {
        collection: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).toBe(false);
  });

  it("filters by actor case-insensitively", () => {
    expect(
      matchesEvent(listing, {
        actor: "0xdddddddddddddddddddddddddddddddddddddddd",
      }),
    ).toBe(true);
    expect(matchesEvent(trade, { actor: "0xnotanaddress" })).toBe(false);
  });

  it("filters by sinceTimestamp (inclusive)", () => {
    expect(matchesEvent(trade, { sinceTimestamp: 1700000000 })).toBe(true);
    expect(matchesEvent(trade, { sinceTimestamp: 1700000001 })).toBe(false);
  });

  it("filters by untilTimestamp (inclusive)", () => {
    expect(matchesEvent(trade, { untilTimestamp: 1700000000 })).toBe(true);
    expect(matchesEvent(trade, { untilTimestamp: 1699999999 })).toBe(false);
  });

  it("search hits actor, collection, contract name, event type", () => {
    expect(matchesEvent(listing, { search: "0xCCCC" })).toBe(true);
    expect(matchesEvent(listing, { search: "listing_created" })).toBe(true);
    expect(matchesEvent(listing, { search: "NFTExchange" })).toBe(true);
    expect(matchesEvent(listing, { search: "no-match" })).toBe(false);
  });

  it("search is case-insensitive", () => {
    expect(matchesEvent(listing, { search: "NFTEXCHANGE" })).toBe(true);
  });

  it("AND-combines multiple filter fields", () => {
    expect(
      matchesEvent(listing, {
        categories: ["listing"],
        actor: "0xdddddddddddddddddddddddddddddddddddddddd",
        sinceTimestamp: 1699999000,
      }),
    ).toBe(true);
    expect(
      matchesEvent(listing, {
        categories: ["listing"],
        actor: "0x1111111111111111111111111111111111111111",
      }),
    ).toBe(false);
  });
});

describe("filterEvents", () => {
  it("returns a copy when no filter is active", () => {
    const out = filterEvents(sample, {});
    expect(out).toEqual(sample);
    expect(out).not.toBe(sample);
  });

  it("filters by category", () => {
    expect(filterEvents(sample, { categories: ["mint", "trade"] })).toEqual([trade, mintFresh]);
  });

  it("respects sinceTimestamp + categories together", () => {
    const out = filterEvents(sample, {
      categories: ["mint", "listing"],
      sinceTimestamp: 1700000000,
    });
    expect(out).toEqual([mintFresh]);
  });

  it("returns empty array when nothing matches", () => {
    expect(filterEvents(sample, { eventTypes: ["does_not_exist"] })).toEqual([]);
  });

  it("ignores whitespace-only search strings", () => {
    expect(filterEvents(sample, { search: "   " })).toEqual(sample);
  });
});

describe("hasActiveFilter", () => {
  it.each([
    [{}, false],
    [{ categories: [] }, false],
    [{ eventTypes: [] }, false],
    [{ collection: "" }, false],
    [{ actor: "" }, false],
    [{ search: "" }, false],
    [{ search: "   " }, false],
    [{ categories: ["trade"] }, true],
    [{ search: "abc" }, true],
    [{ sinceTimestamp: 1 }, true],
    [{ untilTimestamp: 1 }, true],
  ])("hasActiveFilter(%p) === %p", (input, expected) => {
    expect(hasActiveFilter(input as Parameters<typeof hasActiveFilter>[0])).toBe(expected);
  });
});

describe("groupEventsByCategory", () => {
  it("places each event under the right key", () => {
    const grouped = groupEventsByCategory(sample);
    expect(grouped.trade).toEqual([trade]);
    expect(grouped.auction).toEqual([auction]);
    expect(grouped.offer).toEqual([offer]);
    expect(grouped.mint).toEqual([mintFresh]);
    expect(grouped.listing).toEqual([listing]);
    expect(grouped.collection).toEqual([]);
  });

  it("returns empty buckets for an empty input", () => {
    const grouped = groupEventsByCategory([]);
    expect(grouped).toEqual({
      auction: [],
      offer: [],
      trade: [],
      mint: [],
      collection: [],
      listing: [],
    });
  });
});

describe("countByCategory", () => {
  it("counts each category", () => {
    expect(countByCategory(sample)).toEqual({
      auction: 1,
      offer: 1,
      trade: 1,
      mint: 1,
      collection: 0,
      listing: 1,
    });
  });
});
