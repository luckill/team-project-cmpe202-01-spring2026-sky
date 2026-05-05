import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, Users, Eye, Edit, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatEventDate } from "@/lib/eventUtils";

const STATUS_VARIANT = {
  pending: { label: "Pending review", className: "bg-warning/15 text-warning", Icon: Clock },
  approved: { label: "Approved", className: "bg-success/15 text-success", Icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive", Icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", Icon: XCircle }
};

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [processingEventId, setProcessingEventId] = useState(null);
  const userId = user?.id ?? null;

  const load = async (shouldIgnore = () => false) => {
    if (!userId) return;
    setLoading(true);
    setLoadError("");
    try {
      const evs = await eventsApi.getOrganizerEvents();
      if (shouldIgnore()) return;
      setEvents(evs ?? []);
    } catch (error) {
      if (shouldIgnore()) return;
      setEvents([]);
      setLoadError(error instanceof Error ? error.message : "Could not load your events.");
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
  }, [userId, refreshKey]);

  useEffect(() => {document.title = "Organizer dashboard · Eventful";}, []);

  const handleCancelEvent = async (id) => {
    if (!confirm("Cancel this event? Confirmed registrations will also be cancelled.")) return;
    setProcessingEventId(id);
    try {
      await eventsApi.cancelEvent(id);
      toast({ title: "Event cancelled" });
      setRefreshKey((current) => current + 1);
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingEventId(null);
    }
  };

  const totals = {
    total: events.length,
    upcoming: events.filter((e) => new Date(e.start_at) > new Date() && e.status === "approved").length,
    rsvps: events.reduce((s, e) => s + e.registration_count, 0)
  };

  return (
    <div className="container py-8 md:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Organizer dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your events and attendees</p>
        </div>
        <Button asChild size="lg">
          <Link to="/organizer/events/new"><Plus className="h-4 w-4" /> Create event</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total events</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totals.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Upcoming</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totals.upcoming}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total RSVPs</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{totals.rsvps}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your events</CardTitle></CardHeader>
        <CardContent>
          {loadError &&
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          }
          {loading ?
          <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div> :
          loadError ?
          <div className="text-center py-12">
              <p className="font-semibold">Could not load your organizer dashboard</p>
              <p className="text-sm text-muted-foreground">This page now depends entirely on the cloud API.</p>
              <Button className="mt-4" onClick={() => void load()}>Try again</Button>
            </div> :
          events.length === 0 ?
          <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden />
              <p className="mt-3 font-semibold">No events yet</p>
              <p className="text-sm text-muted-foreground">Create your first event to get started.</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button asChild><Link to="/organizer/events/new">Create event</Link></Button>
              </div>
            </div> :

          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>RSVPs</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => {
                  const s = STATUS_VARIANT[e.status] ?? STATUS_VARIANT.pending;
                  const Icon = s.Icon;
                  const isCancelled = e.status === "cancelled";
                  const isProcessing = processingEventId === e.id;
                  return (
                    <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell className="text-sm">{formatEventDate(e.start_at)}</TableCell>
                        <TableCell>
                          <Badge className={s.className}>
                            <Icon className="h-3 w-3" /> {s.label}
                          </Badge>
                        </TableCell>
                        <TableCell><Users className="inline h-3.5 w-3.5 mr-1" />{e.registration_count} / {e.capacity}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" aria-label="View">
                              <Link to={`/events/${e.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon" aria-label="Attendees">
                              <Link to={`/organizer/events/${e.id}/attendees`}><Users className="h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="ghost" size="icon" aria-label="Edit">
                              <Link to={`/organizer/events/${e.id}/edit`}><Edit className="h-4 w-4" /></Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={isCancelled ? "Event already cancelled" : "Cancel event"}
                              disabled={isCancelled || isProcessing}
                              onClick={() => handleCancelEvent(e.id)}
                            >
                              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-destructive" />}
                              {isCancelled ? "Cancelled" : "Cancel"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
