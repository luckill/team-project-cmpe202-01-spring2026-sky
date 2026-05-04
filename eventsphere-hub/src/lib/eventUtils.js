import { format, isPast, isToday, isTomorrow } from "date-fns";

export function formatEventDate(iso) {
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, "p")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "p")}`;
  return format(d, "EEE, MMM d · p");
}

export function formatEventDateLong(iso) {
  return format(new Date(iso), "EEEE, MMMM d, yyyy 'at' p");
}

export function isEventPast(iso) {
  return isPast(new Date(iso));
}

/** Build a Google Calendar template URL for an event */
export function googleCalendarUrl(opts)





{
  const fmt = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.details ?? "",
    location: opts.location ?? ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}