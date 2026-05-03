
# EventBrite-like Events Platform

A full-stack events platform with auth, role-based access, event management, RSVP/ticketing, and admin moderation. Eventbrite-inspired visual style (warm coral/orange accents, card-heavy layouts).

## Backend (Lovable Cloud)

**Auth**: Email/password sign-up & sign-in. No social providers.

**Roles**: `attendee`, `organizer`, `admin` stored in a separate `user_roles` table with a `has_role()` security-definer function (no recursion in RLS).

**Tables**:
- `profiles` — display name, avatar, bio
- `user_roles` — user_id + role enum
- `categories` — name, slug, icon
- `events` — title, description, organizer_id, category_id, start/end datetime, venue name, address, lat/lng, capacity, cover image, status (`draft` / `pending` / `approved` / `rejected`), is_free
- `tickets` — event_id, name, price (0 for free), quantity
- `registrations` — event_id, user_id, ticket_id, status (`confirmed` / `cancelled`), created_at
- `event_schedule_items` — event_id, time, title, description (for agenda)

**RLS**: Public can read approved events. Organizers manage their own events. Admins manage all. Attendees manage their own registrations.

**Storage**: Bucket for event cover images.

## Pages & Features

### Public
- **Home** — Hero search bar, featured events, category tiles, upcoming events grid
- **Browse / Discover** — Search by keyword, filter by category/date/location/price (free), sort, paginated card grid
- **Event Detail** — Cover image, title, organizer card, date/time, full description, agenda/schedule, embedded Google Map, "Save to Google Calendar" button, RSVP/Get Tickets CTA, capacity & spots-left indicator
- **Auth** — Sign in, sign up (choose attendee or organizer at signup)

### Attendee
- **My Tickets** — List of upcoming & past registrations with QR-style confirmation code, cancel option, add-to-calendar
- **Profile** — Edit display name, avatar, bio

### Organizer
- **Organizer Dashboard** — Stats (total events, total RSVPs, upcoming)
- **Create / Edit Event** — Multi-step form: basics → location (Google Places autocomplete + map pin) → date/time → capacity & tickets → agenda → cover image → submit for approval
- **My Events** — Table with status badges, edit/delete, view attendees
- **Attendee List** — Per-event roster with check-in toggle, CSV export

### Admin
- **Admin Dashboard** — Pending events queue, approve/reject with note, user management (assign/revoke roles), all events table, basic platform stats

## Integrations
- **Google Maps** — Places autocomplete on event creation, embedded map on event detail (you'll provide an API key when prompted)
- **Google Calendar** — "Add to Calendar" generates a calendar.google.com URL with event details (no API key needed)

## Design System
Eventbrite-inspired: coral/orange primary (`#F05537`-like), clean white surfaces, soft shadows, rounded cards, bold sans-serif headings, generous whitespace. Fully responsive (mobile-first), accessible (semantic HTML, ARIA labels, keyboard nav, focus states, color-contrast safe).

## Out of Scope (v1)
- Payments (free events only)
- Email/notifications (skipped per your choice — confirmations shown in-app via toast + My Tickets page)
- Native mobile apps (responsive web only)

## Build Order
1. Enable Lovable Cloud + design system + auth + roles
2. Database schema + RLS + seed categories
3. Public pages (home, browse, event detail) with mock data, then wire to DB
4. Organizer flow (create/edit/manage events, attendee list)
5. Attendee flow (RSVP, my tickets, calendar export)
6. Admin moderation dashboard
7. Google Maps integration (will request API key)
