import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Calendar, MapPin, Users, Tag, ArrowLeft, CalendarPlus, Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventsApi, rsvpApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatEventDateLong, googleCalendarUrl, isEventPast } from "@/lib/eventUtils";
import { formatLocationAddress } from "@/lib/location";

const EVENT_ERROR_STATES = {
  404: {
    title: "Event not found",
    description: "This event may have been removed or is no longer available."
  },
  422: {
    title: "Invalid event link",
    description: "This event link is invalid or incomplete. Go back to browse and choose another event."
  }
};

function getErrorStatus(error) {
  return typeof error?.status === "number" ? error.status : null;
}

function getErrorPath(error) {
  return typeof error?.path === "string" ? error.path : "";
}



























export default function EventDetail() {
  const { id } = useParams();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadErrorStatus, setLoadErrorStatus] = useState(null);
  const [loadErrorPath, setLoadErrorPath] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [rsvping, setRsvping] = useState(false);
  const canRsvp = roles.includes("attendee");
  const userId = user?.id ?? null;
  const eventPath = id ? `/events/${id}` : "";

  const load = async (shouldIgnore = () => false) => {
    if (!id) return;
    setLoading(true);
    setLoadError("");
    setLoadErrorStatus(null);
    setLoadErrorPath("");
    try {
      const ev = await eventsApi.getEvent(id);
      let myReg = null;
      if (userId && canRsvp) {
        const mine = await rsvpApi.mine();
        myReg = mine.find((ticket) => ticket.event?.id === id) ?? null;
      }

      if (shouldIgnore()) return;

      setEvent(ev ? {
        ...ev,
        user_registration: myReg ? {
          id: myReg.id,
          status: myReg.status,
          confirmation_code: myReg.confirmation_code
        } : null
      } : null);
    } catch (error) {
      if (shouldIgnore()) return;
      setEvent(null);
      setLoadError(error instanceof Error ? error.message : "Could not load this event.");
      setLoadErrorStatus(getErrorStatus(error));
      setLoadErrorPath(getErrorPath(error));
    } finally {
      if (!shouldIgnore()) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void load(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [id, userId, canRsvp, refreshKey]);

  useEffect(() => {
    if (event) document.title = `${event.title} · Eventful`;
  }, [event]);

  const handleRsvp = async () => {
    if (!user) {navigate(`/auth?mode=signin`);return;}
    if (!canRsvp) return;
    if (!event) return;
    setRsvping(true);
    try {
      await rsvpApi.create(event.id);
      toast({ title: "You're going!", description: "Check My registrations for your confirmation code." });
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast({ title: "Could not register", description: error.message, variant: "destructive" });
    } finally {
      setRsvping(false);
    }
  };

  const handleCancel = async () => {
    if (!event?.user_registration) return;
    if (!canRsvp) return;
    try {
      await rsvpApi.cancel(event.id);
      toast({ title: "Registration cancelled" });
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>);

  }

  if (!event) {
    const eventErrorState =
      loadErrorPath === eventPath ? EVENT_ERROR_STATES[loadErrorStatus] ?? null : null;
    const errorDescription =
      eventErrorState?.description ??
      (loadError || "This event may have been removed or is no longer available.");
    const showRetry = Boolean(loadError) && !eventErrorState;

    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">
          {eventErrorState?.title ?? (loadError ? "Could not load event" : "Event not found")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {errorDescription}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {showRetry && <Button onClick={() => void load()}>Try again</Button>}
          <Button asChild variant="outline">
            <Link to="/browse"><ArrowLeft className="h-4 w-4" /> Back to browse</Link>
          </Button>
        </div>
      </div>);

  }

  const past = isEventPast(event.end_at);
  const spotsLeft = event.capacity - event.registration_count;
  const soldOut = spotsLeft <= 0;
  const formattedAddress = formatLocationAddress({
    address: event.address,
    city: event.city,
    state: event.state,
    country: event.country
  });
  const locationLabel =
    event.venue_name || [event.city, event.state].filter(Boolean).join(", ") || "TBA";
  const locationText = [event.venue_name, formattedAddress].filter(Boolean).join(", ") || locationLabel;
  const scheduleItems = Array.isArray(event.schedule) ?
  event.schedule.filter((item) => item?.start_time || item?.end_time || item?.title) :
  [];
  const mapsEmbedSrc = locationText ?
  `https://www.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed` :
  null;
  const calUrl = googleCalendarUrl({
    title: event.title,
    details: event.description ?? "",
    location: locationText,
    start: event.start_at,
    end: event.end_at
  });

  return (
    <article>
      {/* Cover */}
      <div className="relative w-full bg-secondary">
        <div className="aspect-[21/9] md:aspect-[3/1] max-h-[480px] w-full overflow-hidden">
          {event.cover_image_url ?
          <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" /> :

          <div className="h-full w-full bg-gradient-hero" aria-hidden />
          }
        </div>
      </div>

      <div className="container py-8 lg:py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/browse"><ArrowLeft className="h-4 w-4" /> Browse events</Link>
        </Button>

        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          {/* Main */}
          <div className="space-y-8">
            <header>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {event.category && <Badge variant="secondary">{event.category.name}</Badge>}
                {event.is_free && <Badge className="bg-success text-success-foreground">Free</Badge>}
                {past && <Badge variant="outline">Past event</Badge>}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">{event.title}</h1>
            </header>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date & time</p>
                  <p className="font-semibold mt-0.5">{formatEventDateLong(event.start_at)}</p>
                  <p className="text-sm text-muted-foreground">to {formatEventDateLong(event.end_at)}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-border p-4">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                  <p className="font-semibold mt-0.5 truncate">{locationLabel}</p>
                  <p className="text-sm text-muted-foreground truncate">{formattedAddress || "TBA"}</p>
                </div>
              </div>
            </div>

            {event.description &&
            <section>
                <h2 className="text-xl font-bold mb-3">About this event</h2>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {event.description}
                </div>
              </section>
            }

            {scheduleItems.length > 0 &&
            <section>
                <h2 className="text-xl font-bold mb-3">Schedule</h2>
                <div className="space-y-3">
                  {scheduleItems.map((item, index) =>
                <div key={`${item.title ?? "schedule"}-${index}`} className="rounded-xl border border-border p-4">
                      <p className="font-semibold">{item.title ?? `Agenda item ${index + 1}`}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.start_time ? formatEventDateLong(item.start_time) : "Start time TBD"}
                        {item.end_time ? ` to ${formatEventDateLong(item.end_time)}` : ""}
                      </p>
                      {item.description &&
                  <p className="mt-2 text-sm text-foreground/85 whitespace-pre-wrap">{item.description}</p>
                  }
                    </div>
                )}
                </div>
              </section>
            }

            {mapsEmbedSrc &&
            <section>
                <h2 className="text-xl font-bold mb-3">Location</h2>
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                  <iframe
                  title={`Map of ${event.title}`}
                  src={mapsEmbedSrc}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade" />
                
                </div>
              </section>
            }

            {event.organizer &&
            <section>
                <h2 className="text-xl font-bold mb-3">Organizer</h2>
                <Card>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                        {(event.organizer.name ?? event.organizer.email ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold truncate">{event.organizer.name ?? "Organizer"}</p>
                      {event.organizer.email &&
                      <p className="text-sm text-muted-foreground truncate">{event.organizer.email}</p>
                      }
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified organizer
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            }
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="shadow-elevation-md">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-3xl font-extrabold text-primary">{event.is_free ? "Free" : "Paid"}</p>
                  <p className="text-sm text-muted-foreground">
                    <Users className="inline h-3.5 w-3.5 mr-1" />
                    {event.registration_count} going · {Math.max(0, spotsLeft)} spots left
                  </p>
                </div>

                {event.user_registration ?
                <>
                    <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-center">
                      <p className="text-xs text-success font-semibold uppercase tracking-wide">You're going</p>
                      <p className="font-mono text-lg font-bold mt-1">{event.user_registration.confirmation_code}</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleCancel}>
                      <X className="h-4 w-4" /> Cancel registration
                    </Button>
                  </> :
                past ?
                <Button disabled className="w-full" size="lg">Event ended</Button> :
                soldOut ?
                <Button disabled className="w-full" size="lg">Sold out</Button> :
                user && !canRsvp ?
                <Button disabled className="w-full" size="lg">Attendees only</Button> :

                <Button onClick={handleRsvp} disabled={rsvping} className="w-full" size="lg">
                    {rsvping && <Loader2 className="h-4 w-4 animate-spin" />}
                    {user ? "Reserve a spot" : "Sign in to register"}
                  </Button>
                }

                <Button asChild variant="outline" className="w-full">
                  <a href={calUrl} target="_blank" rel="noopener noreferrer">
                    <CalendarPlus className="h-4 w-4" /> Add to Google Calendar
                  </a>
                </Button>

                {event.category &&
                <Link
                  to={`/browse?category=${event.category.slug}`}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                  
                    <Tag className="h-3.5 w-3.5" /> More {event.category.name} events
                  </Link>
                }
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </article>);

}
