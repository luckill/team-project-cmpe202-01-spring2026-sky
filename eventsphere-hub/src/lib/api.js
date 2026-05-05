import { formatLocationAddress, parseLocationAddress } from "@/lib/location";

const AUTH_STORAGE_KEY = "eventful.awsAuth";
const DEFAULT_AUTH_TOKEN_TYPE = "access";

export const NETWORK_EVENT_NAME = "eventful-network";

const DEV_PROXY_PREFIX = "/__cloud";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
const AUTH_TOKEN_TYPE = (
  import.meta.env.VITE_AUTH_TOKEN_TYPE ?? DEFAULT_AUTH_TOKEN_TYPE
).toLowerCase();

export const DEFAULT_CATEGORIES = [
  { id: "music", name: "Music", slug: "music", icon: "Music" },
  { id: "business", name: "Business", slug: "business", icon: "Briefcase" },
  { id: "food-drink", name: "Food & Drink", slug: "food-drink", icon: "UtensilsCrossed" },
  { id: "community", name: "Community", slug: "community", icon: "Users" },
  { id: "arts", name: "Arts", slug: "arts", icon: "Palette" },
  { id: "sports-fitness", name: "Sports & Fitness", slug: "sports-fitness", icon: "Dumbbell" },
  { id: "health", name: "Health", slug: "health", icon: "HeartPulse" },
  { id: "tech", name: "Tech", slug: "tech", icon: "Laptop" },
  { id: "travel-outdoor", name: "Travel & Outdoor", slug: "travel-outdoor", icon: "Mountain" },
  { id: "film-media", name: "Film & Media", slug: "film-media", icon: "Film" },
  { id: "education", name: "Education", slug: "education", icon: "GraduationCap" },
  { id: "family", name: "Family", slug: "family", icon: "Baby" }
];

function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `request-${crypto.randomUUID()}`;
  }

  return `request-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function dispatchBrowserEvent(name, detail) {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => item.msg ?? String(item)).join(", ");
  }
  if (typeof payload.message === "string") return payload.message;
  return fallback;
}

export class ApiError extends Error {
  constructor(message, { status = null, payload = null, path = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.path = path;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest(path, options = {}) {
  const { auth = false, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestUrl = apiUrl(normalizedPath);
  const transportUrl =
    import.meta.env.DEV && API_BASE_URL
      ? `${DEV_PROXY_PREFIX}${normalizedPath}`
      : requestUrl;
  const method = String(rest.method ?? "GET").toUpperCase();
  const startedAt =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  if (auth) {
    const token = getBearerToken();
    if (!token) throw new Error("Please sign in first.");
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(transportUrl, {
      ...rest,
      body: requestBody,
      headers: requestHeaders
    });
    const payload = await parseResponse(response);
    const finishedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    dispatchBrowserEvent(NETWORK_EVENT_NAME, {
      id: createRequestId(),
      method,
      path: normalizedPath,
      url: requestUrl,
      transport_url: transportUrl,
      status: response.status,
      ok: response.ok,
      duration_ms: Math.round(finishedAt - startedAt),
      created_at: new Date().toISOString()
    });

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(payload, `Request failed with status ${response.status}`),
        {
          status: response.status,
          payload,
          path: normalizedPath
        }
      );
    }

    return payload;
  } catch (error) {
    const finishedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    dispatchBrowserEvent(NETWORK_EVENT_NAME, {
      id: createRequestId(),
      method,
      path: normalizedPath,
      url: requestUrl,
      transport_url: transportUrl,
      status: "ERR",
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
      duration_ms: Math.round(finishedAt - startedAt),
      created_at: new Date().toISOString()
    });

    throw error;
  }
}

function decodeJwtPayload(token) {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function normalizeGroups(groups) {
  if (Array.isArray(groups)) return groups;
  if (typeof groups === "string") {
    return groups
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean);
  }
  return [];
}

function rolesFromClaims(claims) {
  const groups = normalizeGroups(claims?.["cognito:groups"]);
  if (groups.includes("admin")) return ["admin"];
  if (groups.includes("organizer")) return ["organizer"];
  return ["attendee"];
}

function sessionFromTokens(tokens) {
  if (!tokens?.accessToken && !tokens?.idToken) return null;

  const claims =
    decodeJwtPayload(tokens.idToken) ??
    decodeJwtPayload(tokens.accessToken) ??
    {};

  if (claims.exp && claims.exp * 1000 <= Date.now()) {
    return null;
  }

  const email = claims.email ?? tokens.email ?? "";
  const name = claims.name ?? email.split("@")[0] ?? "";

  return {
    tokens,
    user: {
      id: claims.sub ?? email,
      email,
      name,
      display_name: name,
      claims
    },
    roles: rolesFromClaims(claims)
  };
}

function normalizeAuthTokens(payload, email) {
  return {
    accessToken:
      payload.AccessToken ?? payload.access_token ?? payload.accessToken ?? null,
    idToken: payload.IdToken ?? payload.id_token ?? payload.idToken ?? null,
    refreshToken:
      payload.RefreshToken ?? payload.refresh_token ?? payload.refreshToken ?? null,
    expiresIn: payload.ExpiresIn ?? payload.expires_in ?? payload.expiresIn ?? null,
    tokenType: payload.TokenType ?? payload.token_type ?? payload.tokenType ?? "Bearer",
    email
  };
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const session = sessionFromTokens(JSON.parse(raw));
    if (!session) {
      clearStoredAuth();
      return null;
    }

    return session;
  } catch {
    try {
      clearStoredAuth();
    } catch {
      // Treat unavailable storage as a signed-out session.
    }
    return null;
  }
}

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("eventful-auth-change"));
  }
}

export function setStoredAuth(payload, email) {
  const tokens = normalizeAuthTokens(payload, email);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  notifyAuthChange();
  return sessionFromTokens(tokens);
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  notifyAuthChange();
}

export function getBearerToken() {
  const session = getStoredAuth();
  if (!session) return null;
  return AUTH_TOKEN_TYPE === "id" ? session.tokens.idToken : session.tokens.accessToken;
}

export const authApi = {
  signUp({ name, email, password }) {
    return apiRequest("/auth/signup", {
      method: "POST",
      body: { name, email, password }
    });
  },
  confirmSignUp({ email, code }) {
    return apiRequest("/auth/confirm", {
      method: "POST",
      body: { email, code }
    });
  },
  async login({ email, password }) {
    const payload = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password }
    });
    return setStoredAuth(payload, email);
  },
  async logout() {
    const session = getStoredAuth();
    try {
      if (session?.tokens?.accessToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          auth: true,
          body: { access_token: session.tokens.accessToken }
        });
      }
    } finally {
      clearStoredAuth();
    }
  }
};

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dedupeById(items) {
  const seen = new Map();
  for (const item of items) {
    if (item?.id) seen.set(item.id, item);
  }
  return [...seen.values()];
}

function normalizeRegistrationStatus(status) {
  if (typeof status !== "string") return status ?? null;
  return status.toLowerCase();
}

function mapStatus(status) {
  if (status === "pending_approval") return "pending";
  return status ?? "pending";
}

function normalizeOrganizer(event) {
  const rawOrganizer =
    event.organizer && typeof event.organizer === "object" ? event.organizer : null;
  const name = rawOrganizer?.name ?? rawOrganizer?.display_name ?? event.organizer_name ?? null;
  const email = rawOrganizer?.email ?? event.organizer_email ?? null;

  if (!rawOrganizer && !name && !email) return null;

  return {
    ...rawOrganizer,
    name,
    email,
    display_name: name ?? "Organizer"
  };
}

function normalizeSchedule(event) {
  const schedule = event.schedule ?? event.event_schedule_items ?? [];

  if (Array.isArray(schedule) && schedule.length > 0) {
    return schedule;
  }

  if (schedule && typeof schedule === "object") {
    const startTime = schedule.start_time ?? event.start_time ?? event.start_at;
    const endTime = schedule.end_time ?? event.end_time ?? event.end_at;
    return startTime || endTime
      ? [
          {
            ...schedule,
            start_time: startTime,
            end_time: endTime,
            title: schedule.title ?? event.title
          }
        ]
      : [];
  }

  const fallbackStartTime = event.start_time ?? event.start_at;
  const fallbackEndTime = event.end_time ?? event.end_at;
  return fallbackStartTime || fallbackEndTime
    ? [
        {
          title: event.title,
          start_time: fallbackStartTime,
          end_time: fallbackEndTime,
          description: event.summary ?? event.description ?? null
        }
      ]
    : [];
}

export function normalizeEvent(event) {
  if (!event || typeof event !== "object") return null;

  const categoryName =
    event.category_name ?? event.category?.name ?? event.category ?? null;
  const categorySlug = event.category_slug ?? event.category?.slug ?? slugify(categoryName);
  const rawLocationAddress = event.location_address ?? event.address ?? "";
  const parsedLocationAddress = parseLocationAddress(rawLocationAddress);
  const address = event.address ?? parsedLocationAddress.address;
  const city = event.city ?? parsedLocationAddress.city ?? "";
  const state = event.state ?? parsedLocationAddress.state ?? "";
  const country = event.country ?? parsedLocationAddress.country ?? "";
  const venueName = event.venue_name ?? event.location ?? "";
  const locationAddress =
    formatLocationAddress({ address, city, state, country }) || rawLocationAddress || "";
  const startAt = event.start_at ?? event.start_time;
  const endAt = event.end_at ?? event.end_time;
  const organizer = normalizeOrganizer(event);

  return {
    ...event,
    status: mapStatus(event.status),
    start_at: startAt,
    end_at: endAt,
    summary: event.summary ?? null,
    cover_image_url: event.cover_image_url ?? null,
    venue_name: venueName,
    location_address: locationAddress,
    address,
    city,
    state,
    country,
    is_free: event.is_free ?? true,
    is_online: event.is_online ?? false,
    online_url: event.online_url ?? null,
    category_name: categoryName,
    _category_slug: categorySlug,
    category: categoryName ? { name: categoryName, slug: categorySlug } : null,
    organizer,
    organizer_name: organizer?.name ?? event.organizer_name ?? null,
    organizer_email: organizer?.email ?? event.organizer_email ?? null,
    registration_count:
      event.registration_count ??
      event.registered_count ??
      event.attendee_count ??
      0,
    schedule: normalizeSchedule(event),
    user_registration: event.user_registration
      ? {
          ...event.user_registration,
          status: normalizeRegistrationStatus(event.user_registration.status)
        }
      : null,
    user_registration_status: normalizeRegistrationStatus(
      event.user_registration_status
    )
  };
}

function normalizeEventList(payload) {
  const list = Array.isArray(payload) ? payload : payload?.events ?? payload?.items ?? [];
  return list.map(normalizeEvent).filter(Boolean);
}

function filterAndSortEvents(events, filters = {}) {
  const {
    q = "",
    categorySlug = "",
    free = false,
    sort = "soonest",
    upcomingOnly = false,
    limit
  } = filters;
  const search = q.trim().toLowerCase();

  let filtered = events.filter((event) => {
    if (event.status && !["approved", "pending", "cancelled", "rejected"].includes(event.status)) {
      return false;
    }
    if (upcomingOnly && event.start_at && new Date(event.start_at) < new Date()) {
      return false;
    }
    if (free && !event.is_free) return false;
    if (categorySlug && event._category_slug !== categorySlug) return false;
    if (!search) return true;

    return [event.title, event.description, event.city, event.venue_name, event.category_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  filtered.sort((a, b) => {
    const aTime = new Date(a.start_at ?? 0).getTime();
    const bTime = new Date(b.start_at ?? 0).getTime();
    return sort === "latest" ? bTime - aTime : aTime - bTime;
  });

  return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
}

export const eventsApi = {
  async listCategories() {
    const payload = await apiRequest("/events/categories");
    const categories = Array.isArray(payload) ? payload : payload?.categories ?? [];
    return categories.map((category) => ({
      ...category,
      slug: category.slug ?? slugify(category.name),
      icon:
        category.icon ??
        DEFAULT_CATEGORIES.find((item) => item.name === category.name)?.icon ??
        null
    }));
  },
  async listEvents(filters = {}) {
    const payload = await apiRequest("/events/");
    const events = normalizeEventList(payload).filter((event) => event.status === "approved");
    return filterAndSortEvents(dedupeById(events), filters);
  },
  async getEvent(id) {
    const payload = await apiRequest(`/events/${id}`, {
      auth: Boolean(getBearerToken())
    });
    return normalizeEvent(payload);
  },
  async createEvent(payload) {
    return apiRequest("/events/create", {
      method: "POST",
      auth: true,
      body: payload
    });
  },
  async updateEvent(id, payload) {
    return apiRequest(`/events/${id}`, {
      method: "PATCH",
      auth: true,
      body: payload
    });
  },
  async cancelEvent(id) {
    return apiRequest(`/events/${id}`, {
      method: "DELETE",
      auth: true
    });
  },
  async deleteEvent(id) {
    return this.cancelEvent(id);
  },
  async getOrganizerEvents() {
    const payload = await apiRequest("/events/mine", { auth: true });
    return normalizeEventList(payload);
  },
  async getEventAttendees(id) {
    const payload = await apiRequest(`/events/${id}/attendees`, { auth: true });
    if (Array.isArray(payload)) {
      return {
        event_title: "Attendees",
        attendees: payload
      };
    }
    return payload;
  }
};

export const rsvpApi = {
  async create(eventId) {
    const payload = await apiRequest(`/rsvp/${eventId}`, {
      method: "POST",
      auth: true
    });
    return {
      ...payload,
      status: normalizeRegistrationStatus(payload?.status)
    };
  },
  async cancel(eventId) {
    const payload = await apiRequest(`/rsvp/${eventId}`, {
      method: "DELETE",
      auth: true
    });
    return {
      ...payload,
      status: normalizeRegistrationStatus(payload?.status)
    };
  },
  async mine() {
    const payload = await apiRequest("/rsvp/me", { auth: true });
    const list = Array.isArray(payload)
      ? payload
      : payload?.registrations ?? payload?.rsvps ?? [];

    return list
      .map((item) => ({
        ...item,
        id: item.id ?? item.registration_id,
        registration_id: item.registration_id ?? item.id,
        confirmation_code: item.confirmation_code ?? item.registration_id ?? item.id,
        status: normalizeRegistrationStatus(item.status),
        event: normalizeEvent(item.event)
      }))
      .filter((item) => item.event);
  }
};

export const usersApi = {
  async getProfile() {
    const payload = await apiRequest("/users/me", { auth: true });
    return payload && typeof payload === "object" ? payload : null;
  },
  async updateProfile(payload) {
    return apiRequest("/users/me", {
      method: "PATCH",
      auth: true,
      body: payload
    });
  },
  async requestOrganizerUpgrade() {
    return apiRequest("/users/me/request-organizer", {
      method: "POST",
      auth: true
    });
  },
  async listUsers() {
    const payload = await apiRequest("/users/", { auth: true });
    return Array.isArray(payload) ? payload : payload?.users ?? [];
  }
};

export const adminApi = {
  async getPendingEvents() {
    const payload = await apiRequest("/admin/events/pending", { auth: true });
    return normalizeEventList(payload);
  },
  async listAllEvents() {
    const payload = await apiRequest("/admin/events", { auth: true });
    return normalizeEventList(payload);
  },
  async approveEvent(id) {
    return apiRequest(`/admin/events/${id}/approve`, {
      method: "PATCH",
      auth: true
    });
  },
  async rejectEvent(id, reason) {
    return apiRequest(`/admin/events/${id}/reject`, {
      method: "PATCH",
      auth: true,
      body: { reason }
    });
  },
  async promoteUser(id) {
    return apiRequest(`/admin/users/${id}/promote`, {
      method: "PATCH",
      auth: true
    });
  },
  async revokeAdmin(id) {
    return apiRequest(`/admin/users/${id}/revoke`, {
      method: "PATCH",
      auth: true
    });
  },
  async listOrganizerRequests() {
    const payload = await apiRequest("/admin/organizer-requests", { auth: true });
    return Array.isArray(payload) ? payload : payload?.requests ?? [];
  },
  async approveOrganizerRequest(id) {
    return apiRequest(`/admin/organizer-requests/${id}/approve`, {
      method: "PATCH",
      auth: true
    });
  },
  async rejectOrganizerRequest(id) {
    return apiRequest(`/admin/organizer-requests/${id}/reject`, {
      method: "PATCH",
      auth: true
    });
  }
};

export { API_BASE_URL };
