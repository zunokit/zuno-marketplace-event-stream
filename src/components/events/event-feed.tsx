"use client";

import { Spinner } from "@/components/ui/spinner";
import { useEvents } from "@/hooks/use-events";
import { EventTicker } from "./event-ticker";
import { EventEmpty } from "./event-empty";
import { formatDistanceToNow } from "date-fns";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

interface EventFeedProps {
  limit?: number;
  autoScroll?: boolean;
}

/**
 * Main event feed container
 * Fetches events, handles loading/error states, and displays ticker
 */
export function EventFeed({ limit = 50, autoScroll = true }: EventFeedProps) {
  const { events, isLoading, isError, error, lastUpdated } = useEvents({
    limit,
    refetchInterval: POLLING_INTERVAL_MS,
  });

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Live Events</h2>
          {isLoading && (
            <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        {/* Last Updated Indicator */}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Updated{" "}
            {formatDistanceToNow(lastUpdated, {
              addSuffix: true,
              includeSeconds: true,
            })}
          </p>
        )}
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-hidden">
        {isLoading && events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-muted-foreground">
                Loading events...
              </p>
            </div>
          </div>
        ) : isError ? (
          <EventEmpty isError errorMessage={error?.message} />
        ) : events.length === 0 ? (
          <EventEmpty />
        ) : (
          <EventTicker events={events} autoScroll={autoScroll} />
        )}
      </div>

      {/* Footer with event count */}
      {events.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Showing {events.length} recent events
          </p>
        </div>
      )}
    </div>
  );
}
