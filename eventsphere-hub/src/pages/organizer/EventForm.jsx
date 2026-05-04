import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { eventsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatLocationAddress, parseLocationAddress } from "@/lib/location";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).optional(),
  category_id: z.string().trim().nullable(),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  venue_name: z.string().trim().max(120).optional(),
  address: z.string().trim().max(240).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  capacity: z.number().int().positive().max(100000)
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EDIT_EVENT_ERROR_STATES = {
  404: {
    title: "Event not found",
    description: "This event no longer exists or is no longer available to edit."
  },
  422: {
    title: "Invalid event link",
    description: "This edit link is invalid or incomplete. Return to your dashboard and open the event again."
  }
};

function getErrorStatus(error) {
  return typeof error?.status === "number" ? error.status : null;
}

function getErrorPath(error) {
  return typeof error?.path === "string" ? error.path : "";
}

export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loadErrorStatus, setLoadErrorStatus] = useState(null);
  const [loadErrorPath, setLoadErrorPath] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [venueName, setVenueName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [capacity, setCapacity] = useState(100);
  const eventPath = id ? `/events/${id}` : "";

  const loadForm = async (shouldIgnore = () => false) => {
    setLoading(true);
    setLoadError("");
    setLoadErrorStatus(null);
    setLoadErrorPath("");
    try {
      const categoryData = await eventsApi.listCategories();
      if (shouldIgnore()) return;
      setCategories(categoryData ?? []);

      if (isEdit && id) {
        const ev = await eventsApi.getEvent(id);
        if (shouldIgnore() || !ev) return;
        const parsedLocation = parseLocationAddress(ev.location_address ?? ev.address ?? "");
        setTitle(ev.title);
        setDescription(ev.description ?? "");
        setCategoryId(ev.category_id ?? null);
        setStartAt(ev.start_at?.slice(0, 16) ?? "");
        setEndAt(ev.end_at?.slice(0, 16) ?? "");
        setVenueName(ev.venue_name ?? ev.location ?? "");
        setAddress(ev.address ?? parsedLocation.address ?? "");
        setCity(ev.city ?? parsedLocation.city ?? "");
        setState(ev.state ?? parsedLocation.state ?? "");
        setCountry(ev.country ?? parsedLocation.country ?? "");
        setCapacity(ev.capacity);
      }
    } catch (error) {
      if (shouldIgnore()) return;
      setLoadError(error instanceof Error ? error.message : "Could not load event form data.");
      setLoadErrorStatus(getErrorStatus(error));
      setLoadErrorPath(getErrorPath(error));
    } finally {
      if (!shouldIgnore()) setLoading(false);
    }
  };

  useEffect(() => {
    document.title = isEdit ? "Edit event · Eventful" : "Create event · Eventful";
  }, [isEdit]);

  useEffect(() => {
    let cancelled = false;

    void loadForm(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const parsed = schema.safeParse({
        title,
        description: description || undefined,
        category_id: categoryId,
        start_at: startAt,
        end_at: endAt,
        venue_name: venueName || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        capacity: Number(capacity)
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (new Date(endAt) <= new Date(startAt)) throw new Error("End time must be after start time");

      const payload = {
        title,
        description: description || null,
        category_id: categoryId && UUID_PATTERN.test(categoryId) ? categoryId : null,
        category: categoryId ? categories.find((item) => item.id === categoryId)?.name : null,
        start_time: new Date(startAt).toISOString(),
        end_time: new Date(endAt).toISOString(),
        location: venueName || city || null,
        location_address: formatLocationAddress({ address, city, state, country }) || null,
        capacity: Number(capacity),
        latitude: null,
        longitude: null
      };

      if (isEdit && id) {
        await eventsApi.updateEvent(id, payload);
      } else {
        await eventsApi.createEvent(payload);
      }

      toast({
        title: isEdit ? "Event update requested" : "Submitted for review",
        description: "Your event was sent to the API successfully."
      });
      navigate("/organizer");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  if (loadError) {
    const editEventErrorState =
      isEdit && loadErrorPath === eventPath ? EDIT_EVENT_ERROR_STATES[loadErrorStatus] ?? null : null;
    const showRetry = !editEventErrorState;

    return (
      <div className="container max-w-3xl py-8">
        <h1 className="text-3xl font-bold mb-2">{isEdit ? "Edit event" : "Create a new event"}</h1>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-semibold text-destructive">{editEventErrorState?.title ?? "Could not load event form"}</p>
          <p className="mt-2 text-sm text-muted-foreground">{editEventErrorState?.description ?? loadError}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {showRetry && <Button onClick={() => void loadForm()}>Try again</Button>}
            {editEventErrorState &&
            <Button asChild variant="outline">
                <Link to="/organizer">Back to dashboard</Link>
              </Button>
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-3xl font-bold mb-2">{isEdit ? "Edit event" : "Create a new event"}</h1>
      <p className="text-muted-foreground mb-8">Fill in the details and submit your event for review.</p>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Basic info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={5000} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId ?? "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Date & time</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start">Starts *</Label>
              <Input id="start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">Ends *</Label>
              <Input id="end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>In-person events appear on a Google Map.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="venue">Venue name</Label>
                <Input id="venue" value={venueName} onChange={(e) => setVenueName(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addr">Address</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={240} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={80} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Capacity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="cap">Maximum attendees *</Label>
              <Input id="cap" type="number" min={1} max={100000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="button" disabled={saving} onClick={handleSubmit}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit for review
          </Button>
        </div>
      </div>
    </div>
  );
}
