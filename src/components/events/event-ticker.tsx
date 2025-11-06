"use client";

import { useEffect, useRef, useState } from "react";
import { EventItem } from "./event-item";
import type { PonderEvent } from "@/lib/services/ponder-client";
import {
  TICKER_SCROLL_INTERVAL_MS,
  EVENT_ITEM_HEIGHT_PX,
  TICKER_CONTAINER_HEIGHT_PX,
} from "@/lib/constants";

interface EventTickerProps {
  events: PonderEvent[];
  autoScroll?: boolean;
  scrollInterval?: number;
}

/**
 * Auto-scrolling event ticker
 * Events slide up continuously with smooth transitions
 */
export function EventTicker({
  events,
  autoScroll = true,
  scrollInterval = TICKER_SCROLL_INTERVAL_MS,
}: EventTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayEvents, setDisplayEvents] = useState<PonderEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update display events when new events arrive
  useEffect(() => {
    if (events.length > 0) {
      setDisplayEvents(events);
      setCurrentIndex(0);
    }
  }, [events]);

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScroll || displayEvents.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= displayEvents.length) {
          return 0; // Loop back to start
        }
        return next;
      });
    }, scrollInterval);

    return () => clearInterval(timer);
  }, [autoScroll, displayEvents.length, scrollInterval]);

  // Smooth scroll to current index
  useEffect(() => {
    if (!containerRef.current || displayEvents.length === 0) return;

    const container = containerRef.current;
    const targetScroll = currentIndex * EVENT_ITEM_HEIGHT_PX;

    container.scrollTo({
      top: targetScroll,
      behavior: "smooth",
    });
  }, [currentIndex, displayEvents.length]);

  if (displayEvents.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: `${TICKER_CONTAINER_HEIGHT_PX}px` }}
    >
      <div className="space-y-0">
        {displayEvents.map((event, index) => (
          <EventItem key={event.id} event={event} index={index} />
        ))}
      </div>
    </div>
  );
}
