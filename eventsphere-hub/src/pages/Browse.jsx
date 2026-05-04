import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { eventsApi } from "@/lib/api";
import EventCard from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";



export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");

  const q = params.get("q") ?? "";
  const categorySlug = params.get("category") ?? "";
  const free = params.get("free") === "1";
  const sort = params.get("sort") ?? "soonest";

  useEffect(() => {
    document.title = "Browse events · Eventful";
  }, []);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [categoryData, eventData] = await Promise.all([
          eventsApi.listCategories(),
          eventsApi.listEvents({ q, categorySlug, free, sort })
        ]);
        if (cancelled) return;
        setCategories(categoryData ?? []);
        setEvents(eventData ?? []);
      } catch (error) {
        if (cancelled) return;
        setCategories([]);
        setEvents([]);
        setLoadError(error instanceof Error ? error.message : "Could not load events.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadResults();

    return () => {
      cancelled = true;
    };
  }, [q, categorySlug, free, sort, refreshKey]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value && value !== "all") next.set(key, value);else
    next.delete(key);
    setParams(next, { replace: true });
  };

  const onSearch = (e) => {
    e.preventDefault();
    updateParam("q", searchInput.trim() || null);
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (q) n++;
    if (categorySlug) n++;
    if (free) n++;
    return n;
  }, [q, categorySlug, free]);

  const clearAll = () => setParams({}, { replace: true });
  const retryLoad = () => setRefreshKey((current) => current + 1);

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">Browse events</h1>
        <p className="text-muted-foreground mt-1">Find your next experience</p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <form onSubmit={onSearch}>
            <Label htmlFor="search" className="text-xs uppercase tracking-wide text-muted-foreground">
              Search
            </Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Keyword, city..."
                className="pl-9" />
              
            </div>
          </form>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
            <Select value={categorySlug || "all"} onValueChange={(v) => updateParam("category", v === "all" ? null : v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) =>
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sort by</Label>
            <Select value={sort} onValueChange={(v) => updateParam("sort", v === "soonest" ? null : v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="soonest">Soonest first</SelectItem>
                <SelectItem value="latest">Latest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="free"
              checked={free}
              onCheckedChange={(c) => updateParam("free", c ? "1" : null)} />
            
            <Label htmlFor="free" className="cursor-pointer">Free events only</Label>
          </div>

          {activeCount > 0 &&
          <Button variant="outline" size="sm" onClick={clearAll} className="w-full">
              <X className="h-4 w-4" /> Clear filters ({activeCount})
            </Button>
          }
        </aside>

        {/* Results */}
        <div>
          {loadError &&
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-semibold text-destructive">Could not load browse results</p>
              <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
              <Button className="mt-3" onClick={retryLoad}>Try again</Button>
            </div>
          }
          {loading ?
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) =>
            <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
            )}
            </div> :
          loadError ?
          <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-16 text-center">
              <p className="text-lg font-semibold">Cloud data unavailable</p>
              <p className="mt-1 text-muted-foreground">Browse results can only be loaded from the backend now.</p>
            </div> :
          events.length === 0 ?
          <div className="rounded-xl border border-dashed border-border p-16 text-center">
              <p className="text-lg font-semibold">No events found</p>
              <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
              {activeCount > 0 &&
            <Button variant="outline" onClick={clearAll} className="mt-4">Clear filters</Button>
            }
            </div> :

          <>
              <p className="text-sm text-muted-foreground mb-4">{events.length} event{events.length !== 1 ? "s" : ""}</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {events.map((e) => <EventCard key={e.id} event={e} />)}
              </div>
            </>
          }
        </div>
      </div>
    </div>);

}
