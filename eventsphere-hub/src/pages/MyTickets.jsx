import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Ticket, MapPin, CalendarPlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { rsvpApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatEventDateLong, googleCalendarUrl, isEventPast } from "@/lib/eventUtils";
import { formatLocationAddress } from "@/lib/location";


















export default function MyTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!userId) return;
      setLoading(true);
      setLoadError("");
      try {
        const data = await rsvpApi.mine();
        if (cancelled) return;
        setTickets(data ?? []);
      } catch (error) {
        if (cancelled) return;
        setTickets([]);
        setLoadError(error instanceof Error ? error.message : "Could not load your registrations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);
  useEffect(() => {document.title = "My registrations · Eventful";}, []);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this registration?")) return;
    const ticket = tickets.find((item) => item.id === id);
    if (!ticket?.event?.id) return;
    try {
      await rsvpApi.cancel(ticket.event.id);
      toast({ title: "Registration cancelled" });
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const upcoming = tickets.filter((t) => !isEventPast(t.event.end_at));
  const past = tickets.filter((t) => isEventPast(t.event.end_at));

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">My registrations</h1>
      <p className="text-muted-foreground mb-6">Your registrations and confirmation codes</p>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        {loadError &&
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {loadError}
            <Button variant="outline" size="sm" className="ml-3" onClick={() => setRefreshKey((current) => current + 1)}>Try again</Button>
          </div>
        }
        <TabsContent value="upcoming" className="mt-6">
          <TicketList tickets={upcoming} loading={loading} error={loadError} onCancel={handleCancel} canCancel />
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          <TicketList tickets={past} loading={loading} error={loadError} onCancel={handleCancel} canCancel={false} />
        </TabsContent>
      </Tabs>
    </div>);

}

function TicketList({
  tickets, loading, error, onCancel, canCancel


}) {
  if (loading) return <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-12 text-center">
        <p className="font-semibold">Registrations unavailable</p>
        <p className="mt-2 text-sm text-muted-foreground">Your registrations could not be loaded from the cloud API.</p>
      </div>);

  }
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <Ticket className="h-10 w-10 text-muted-foreground mx-auto" aria-hidden />
        <p className="mt-3 font-semibold">No registrations yet</p>
        <p className="text-sm text-muted-foreground">Browse events to find something to attend.</p>
        <Button asChild className="mt-4"><Link to="/browse">Browse events</Link></Button>
      </div>);

  }
  return (
    <div className="space-y-4">
      {tickets.map((t) => {
        const formattedAddress = formatLocationAddress({
          address: t.event.address,
          city: t.event.city,
          state: t.event.state,
          country: t.event.country
        });
        const locationLabel =
          t.event.venue_name || [t.event.city, t.event.state].filter(Boolean).join(", ") || "TBA";
        const calUrl = googleCalendarUrl({
          title: t.event.title,
          location: [t.event.venue_name, formattedAddress].filter(Boolean).join(", "),
          start: t.event.start_at,
          end: t.event.end_at
        });
        return (
          <Card key={t.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid sm:grid-cols-[180px_1fr] gap-0">
                <Link to={`/events/${t.event.id}`} className="aspect-video sm:aspect-auto bg-secondary block">
                  {t.event.cover_image_url ?
                  <img src={t.event.cover_image_url} alt={t.event.title} className="h-full w-full object-cover" /> :

                  <div className="h-full w-full bg-gradient-hero flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-primary-foreground" />
                    </div>
                  }
                </Link>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/events/${t.event.id}`} className="font-bold text-lg hover:text-primary line-clamp-2">
                      {t.event.title}
                    </Link>
                    <Badge variant={t.status === "confirmed" ? "default" : "outline"}>{t.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />{formatEventDateLong(t.event.start_at)}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {locationLabel}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <div className="rounded-md bg-secondary px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">Code:</span>{" "}
                      <span className="font-mono font-bold">{t.confirmation_code}</span>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={calUrl} target="_blank" rel="noopener noreferrer">
                        <CalendarPlus className="h-4 w-4" /> Calendar
                      </a>
                    </Button>
                    {canCancel &&
                    <Button variant="ghost" size="sm" onClick={() => onCancel(t.id)}>
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>);

      })}
    </div>);

}
