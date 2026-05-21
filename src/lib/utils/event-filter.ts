/**
 * Pure, client-side filtering helpers for `PonderEvent[]`.
 *
 * The Ponder API already exposes server-side filtering, but we still want
 * fast client-side narrowing once a batch of events is in memory so the UI
 * can let the user flip category chips / paste a collection address without
 * waiting for a network round-trip.
 *
 * All helpers in this file are pure and synchronous. They are easy to unit
 * test and easy to compose with `useEvents()`.
 */

import type { PonderEvent } from "@/lib/services/ponder-client";

export type EventCategory = PonderEvent["category"];

export interface EventFilter {
  /** Limit to these categories. `undefined` / empty array = no constraint. */
  categories?: EventCategory[];
  /** Limit to these exact event types (`nft_purchased`, `auction_settled`, ...). */
  eventTypes?: string[];
  /** Collection address; matched case-insensitively. */
  collection?: string;
  /** Actor (seller / buyer / minter) address; matched case-insensitively. */
  actor?: string;
  /**
   * Free-text search across actor, counterparty, collection, contractName,
   * eventType, and transactionHash. Case-insensitive substring match.
   */
  search?: string;
  /** Unix-seconds lower bound on `blockTimestamp` (inclusive). */
  sinceTimestamp?: number;
  /** Unix-seconds upper bound on `blockTimestamp` (inclusive). */
  untilTimestamp?: number;
}

function lower(value: string | undefined | null): string {
  return value ? value.toLowerCase() : "";
}

function parseTimestamp(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * True if `event` satisfies every populated field of `filter`. An empty
 * filter (or an absent field) acts as a wildcard.
 */
export function matchesEvent(event: PonderEvent, filter: EventFilter): boolean {
  if (filter.categories && filter.categories.length > 0) {
    if (!filter.categories.includes(event.category)) return false;
  }

  if (filter.eventTypes && filter.eventTypes.length > 0) {
    if (!filter.eventTypes.includes(event.eventType)) return false;
  }

  if (filter.collection) {
    if (lower(event.collection) !== lower(filter.collection)) return false;
  }

  if (filter.actor) {
    if (lower(event.actor) !== lower(filter.actor)) return false;
  }

  if (filter.sinceTimestamp !== undefined) {
    if (parseTimestamp(event.blockTimestamp) < filter.sinceTimestamp) return false;
  }

  if (filter.untilTimestamp !== undefined) {
    if (parseTimestamp(event.blockTimestamp) > filter.untilTimestamp) return false;
  }

  if (filter.search) {
    const needle = filter.search.toLowerCase();
    const haystack = [
      event.actor,
      event.counterparty,
      event.collection,
      event.contractName,
      event.contractAddress,
      event.eventType,
      event.transactionHash,
    ]
      .map(lower)
      .join(" ");
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

/**
 * Apply `matchesEvent` to a list. Returns a new array; never mutates the
 * input.
 */
export function filterEvents(
  events: readonly PonderEvent[],
  filter: EventFilter,
): PonderEvent[] {
  if (!hasActiveFilter(filter)) return [...events];
  return events.filter((event) => matchesEvent(event, filter));
}

/**
 * Quick check to skip filtering work when nothing is active. Treats `''`,
 * `undefined`, and empty arrays as "no filter".
 */
export function hasActiveFilter(filter: EventFilter): boolean {
  if (filter.categories && filter.categories.length > 0) return true;
  if (filter.eventTypes && filter.eventTypes.length > 0) return true;
  if (filter.collection && filter.collection.length > 0) return true;
  if (filter.actor && filter.actor.length > 0) return true;
  if (filter.search && filter.search.trim().length > 0) return true;
  if (filter.sinceTimestamp !== undefined) return true;
  if (filter.untilTimestamp !== undefined) return true;
  return false;
}

/**
 * Group events by their `category` field. Useful for rendering tabs and
 * for showing counts on filter chips.
 */
export function groupEventsByCategory(
  events: readonly PonderEvent[],
): Record<EventCategory, PonderEvent[]> {
  const out: Record<EventCategory, PonderEvent[]> = {
    auction: [],
    offer: [],
    trade: [],
    mint: [],
    collection: [],
    listing: [],
  };
  for (const event of events) {
    if (event.category in out) {
      out[event.category].push(event);
    }
  }
  return out;
}

/**
 * Return a `{ [category]: count }` map. Cheaper than calling
 * `groupEventsByCategory` when you only need counts (e.g. chip badges).
 */
export function countByCategory(
  events: readonly PonderEvent[],
): Record<EventCategory, number> {
  const out: Record<EventCategory, number> = {
    auction: 0,
    offer: 0,
    trade: 0,
    mint: 0,
    collection: 0,
    listing: 0,
  };
  for (const event of events) {
    if (event.category in out) {
      out[event.category] += 1;
    }
  }
  return out;
}
