"use client";

import { Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Event {
  title: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  description: string;
  type: "show" | "auction" | "exhibition";
  link?: string;
}

interface EventCardProps {
  event: Event;
  className?: string;
}

const typeLabels: Record<Event["type"], string> = {
  show: "Mineral Show",
  auction: "Auction",
  exhibition: "Exhibition",
};

export function EventCard({ event, className }: EventCardProps) {
  return (
    <div
      className={cn(
        "silver-border matte-surface rounded-lg p-6 md:p-8",
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Date Badge */}
        <div className="flex-shrink-0 text-center md:w-24">
          <div className="inline-flex flex-col items-center justify-center w-20 h-20 rounded-lg bg-secondary border border-border">
            <span className="text-2xl font-display text-primary">
              {new Date(event.date).getDate()}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {new Date(event.date).toLocaleDateString("en-US", {
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4">
          {/* Type Label */}
          <span className="text-accent uppercase text-xs tracking-[0.2em] font-medium">
            {typeLabels[event.type]}
          </span>

          {/* Title */}
          <h3 className="font-display text-2xl md:text-3xl text-foreground">
            {event.title}
          </h3>

          {/* Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          </div>

          {/* Venue */}
          <p className="text-sm text-foreground">{event.venue}</p>

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {event.description}
          </p>

          {/* CTA */}
          {event.link && (
            <div className="pt-2">
              <a href={event.link} target="_blank" rel="noopener noreferrer">
                <Button variant="heroOutline" size="lg">
                  Learn More
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
