"use client";

import { memo } from "react";
import { ExternalLink } from "lucide-react";
import type { PonderEvent } from "@/lib/services/ponder-client";
import {
  formatAddress,
  formatTimestamp,
  formatEventType,
  getEventIcon,
  getEventColor,
  getEtherscanLink,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface EventItemProps {
  event: PonderEvent;
  index: number;
}

/**
 * Single event item with animation
 * Displays one line of event info that slides up
 */
export const EventItem = memo(function EventItem({
  event,
  index,
}: EventItemProps) {
  const icon = getEventIcon(event.category);
  const colorClass = getEventColor(event.category);
  const explorerLink = getEtherscanLink(event.transactionHash, event.chainId);

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 px-4 border-b border-border/50",
        "animate-slide-up opacity-0",
        "hover:bg-accent/50 transition-colors"
      )}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "forwards",
      }}
    >
      {/* Event Icon */}
      <span className="text-xl flex-shrink-0" aria-label={event.category}>
        {icon}
      </span>

      {/* Event Type */}
      <span className={cn("font-medium text-sm flex-shrink-0 min-w-[140px]", colorClass)}>
        {formatEventType(event.eventType)}
      </span>

      {/* Actor Address */}
      <span className="text-sm text-muted-foreground flex-shrink-0">
        {formatAddress(event.actor)}
      </span>

      {/* Arrow if counterparty exists */}
      {event.counterparty && (
        <>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm text-muted-foreground flex-shrink-0">
            {formatAddress(event.counterparty)}
          </span>
        </>
      )}

      {/* Collection (if exists) */}
      {event.collection && (
        <span className="text-xs text-muted-foreground/70 flex-shrink-0">
          {formatAddress(event.collection)}
        </span>
      )}

      {/* Token ID (if exists) */}
      {event.tokenId && (
        <span className="text-xs font-mono text-muted-foreground/70 flex-shrink-0">
          #{event.tokenId}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-[20px]" />

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground/60 flex-shrink-0 min-w-[100px] text-right">
        {formatTimestamp(event.blockTimestamp)}
      </span>

      {/* Explorer Link */}
      <a
        href={explorerLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground/50 hover:text-primary transition-colors flex-shrink-0"
        title="View on explorer"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
});
