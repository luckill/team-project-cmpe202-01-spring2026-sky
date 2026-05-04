import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { eventsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AttendeeList() {
  const { id } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError("");
      try {
        const response = await eventsApi.getEventAttendees(id);
        const attendeeList = Array.isArray(response) ? response : response?.attendees ?? [];
        if (cancelled) return;
        setEventTitle(Array.isArray(response) ? "Attendees" : response?.event_title ?? "Attendees");
        setAttendees(attendeeList.map((attendee) => ({
          ...attendee,
          id: attendee.registration_id,
          confirmation_code: attendee.confirmation_code ?? attendee.registration_id,
          created_at: attendee.registered_at,
          display_name: attendee.display_name ?? attendee.name ?? attendee.email
        })));
      } catch (error) {
        if (cancelled) return;
        setEventTitle("Attendees");
        setAttendees([]);
        setLoadError(error instanceof Error ? error.message : "Could not load attendees.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);
  useEffect(() => {document.title = "Attendees · Eventful";}, []);

  const exportCsv = () => {
    const rows = [
    ["Name", "Confirmation code", "Status", "Registered at"],
    ...attendees.map((a) => [
    a.display_name ?? "—",
    a.confirmation_code,
    a.status,
    new Date(a.created_at).toISOString()]
    )];

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendees-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/organizer"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      </Button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{eventTitle}</h1>
          <p className="text-muted-foreground mt-1">{attendees.length} registered attendee{attendees.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={attendees.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Attendees</CardTitle></CardHeader>
        <CardContent>
          {loadError &&
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          }
          {loading ?
          <div className="py-8 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
            </div> :
          loadError ?
          <div className="py-8 text-center">
              <p className="font-semibold">Could not load attendees</p>
              <p className="mt-1 text-sm text-muted-foreground">This attendee list is now cloud-backed only.</p>
              <Button className="mt-4" onClick={() => setRefreshKey((current) => current + 1)}>Try again</Button>
            </div> :
          attendees.length === 0 ?
          <p className="text-sm text-muted-foreground text-center py-8">No attendees yet.</p> :

          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.map((a) =>
                <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.display_name ?? "Anonymous"}</TableCell>
                      <TableCell className="font-mono text-xs">{a.confirmation_code}</TableCell>
                      <TableCell><Badge variant={a.status === "confirmed" ? "default" : "outline"}>{a.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </div>
          }
        </CardContent>
      </Card>
    </div>);

}
