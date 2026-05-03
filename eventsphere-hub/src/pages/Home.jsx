import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, Music, Briefcase, UtensilsCrossed, Users, Palette, Dumbbell, HeartPulse, Laptop, Mountain, Film, GraduationCap, Baby } from "lucide-react";
import { eventsApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EventCard from "@/components/EventCard";
import { Skeleton } from "@/components/ui/skeleton";

const ICON_MAP = {
  Music, Briefcase, UtensilsCrossed, Users, Palette, Dumbbell,
  HeartPulse, Laptop, Mountain, Film, GraduationCap, Baby
};








export default function Home() {
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  const loadContent = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [cats, evs] = await Promise.all([
        eventsApi.listCategories(),
        eventsApi.listEvents({ upcomingOnly: true, limit: 8 })
      ]);
      setCategories(cats ?? []);
      setEvents(evs ?? []);
    } catch (error) {
      setCategories([]);
      setEvents([]);
      setLoadError(error instanceof Error ? error.message : "Could not load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Eventful — Discover events near you";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Discover and host events near you. Music, tech, food, sports — all in one place.");
  }, []);

  useEffect(() => {
    loadContent();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" aria-hidden />
        <div className="container relative py-16 md:py-24 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Discover events that move you
            </h1>
            <p className="mt-5 text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
              From local meetups to live music and workshops — find your next favorite experience.
            </p>
            <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-xl" role="search">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search events, categories, cities..."
                  className="pl-12 h-12 rounded-full bg-background text-foreground border-transparent shadow-elevation-md"
                  aria-label="Search events" />
                
              </div>
              <Button type="submit" size="lg" variant="secondary" className="h-12 rounded-full px-8 font-semibold">
                Search
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Browse by category</h2>
          <Link to="/browse" className="text-sm font-semibold text-primary hover:underline hidden sm:inline">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {loadError && !loading ?
          <div className="col-span-full rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-8 text-center">
              <p className="font-semibold">Categories unavailable</p>
              <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
              <Button className="mt-4" onClick={loadContent}>Try again</Button>
            </div> :
          categories.map((c) => {
            const Icon = ICON_MAP[c.icon ?? ""] ?? Music;
            return (
              <Link
                key={c.id}
                to={`/browse?category=${c.slug}`}
                className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-elevation-sm transition-all hover:shadow-elevation-md hover:-translate-y-0.5 hover:border-primary">
                
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <span className="text-sm font-medium">{c.name}</span>
              </Link>);

          })}
        </div>
      </section>

      {/* Upcoming events */}
      <section className="container py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Upcoming events</h2>
            <p className="text-muted-foreground mt-1">Don't miss what's happening soon</p>
          </div>
          <Link to="/browse" className="text-sm font-semibold text-primary hover:underline hidden sm:flex items-center gap-1">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ?
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) =>
          <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/10] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
          )}
          </div> :
        loadError ?
        <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-12 text-center">
            <p className="font-semibold">Could not load upcoming events</p>
            <p className="mt-2 text-muted-foreground">{loadError}</p>
            <Button className="mt-4" onClick={loadContent}>Try again</Button>
          </div> :
        events.length === 0 ?
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">No upcoming events yet. Check back soon!</p>
            <Button asChild className="mt-4">
              <Link to="/auth?mode=signup&role=organizer">Become an organizer</Link>
            </Button>
          </div> :

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {events.map((e) =>
          <EventCard key={e.id} event={e} />
          )}
          </div>
        }
      </section>

      {/* CTA */}
      <section className="container py-12 md:py-16">
        <div className="rounded-2xl bg-gradient-hero p-8 md:p-12 text-primary-foreground shadow-glow text-center">
          <h2 className="text-2xl md:text-4xl font-bold">Host your own event</h2>
          <p className="mt-3 text-lg text-primary-foreground/90 max-w-2xl mx-auto">
            Reach attendees, manage RSVPs, and grow your community — all in one place.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6 rounded-full px-8">
            <Link to="/auth?mode=signup&role=organizer">Get started</Link>
          </Button>
        </div>
      </section>
    </div>);

}
