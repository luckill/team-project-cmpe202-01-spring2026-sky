import { Link } from "react-router-dom";
import { Calendar, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEventDate, isEventPast } from "@/lib/eventUtils";















export default function EventCard({ event }) {
  const past = isEventPast(event.start_at);
  const spotsLeft =
  typeof event.registration_count === "number" ? event.capacity - event.registration_count : null;
  const locationLabel =
  event.venue_name || [event.city, event.state].filter(Boolean).join(", ") || "TBA";

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-elevation-sm transition-all hover:shadow-elevation-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      
      <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
        {event.cover_image_url ?
        <img
          src={event.cover_image_url}
          alt={event.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> :


        <div className="flex h-full w-full items-center justify-center bg-gradient-hero text-primary-foreground">
            <Calendar className="h-10 w-10 opacity-80" aria-hidden />
          </div>
        }
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {event.category_name &&
          <Badge variant="secondary" className="text-xs">{event.category_name}</Badge>
          }
          {event.is_free && <Badge className="text-xs bg-success text-success-foreground">Free</Badge>}
          {past && <Badge variant="outline" className="text-xs">Past</Badge>}
        </div>
        <h3 className="font-bold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{formatEventDate(event.start_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </div>
          {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 20 &&
          <div className="flex items-center gap-1.5 text-warning">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Only {spotsLeft} spots left</span>
            </div>
          }
        </div>
      </div>
    </Link>);

}
