import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORIES, apiRequest, eventsApi, normalizeEvent } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof localStorage.clear === "function") {
    localStorage.clear();
  }
});

describe("eventsApi public reads", () => {
  it("returns cloud categories when the categories route succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify([{ id: "music", name: "Music" }]),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

    const categories = await eventsApi.listCategories();

    expect(fetch.mock.calls[0][0]).toMatch(/\/events\/categories$/);
    expect(categories).toEqual([
      expect.objectContaining({
        id: "music",
        name: "Music",
        slug: "music",
        icon: DEFAULT_CATEGORIES[0].icon
      })
    ]);
  });

  it("rejects when public events cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    ));

    await expect(eventsApi.listEvents()).rejects.toThrow("Unauthorized");
    expect(fetch.mock.calls[0][0]).toMatch(/\/events\/$/);
  });

  it("fetches event details by id and normalizes the response", async () => {
    const event = {
      id: "event-1",
      title: "Career Networking Night",
      start_time: "2026-03-20T01:00:00+00:00",
      end_time: "2026-03-20T03:00:00+00:00"
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify(event),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

    await expect(eventsApi.getEvent("event-1")).resolves.toMatchObject({
      id: "event-1",
      title: "Career Networking Night",
      start_at: "2026-03-20T01:00:00+00:00"
    });
    expect(fetch.mock.calls[0][0]).toMatch(/\/events\/event-1$/);
  });
});

describe("apiRequest errors", () => {
  it("exposes status and path for 404 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ detail: "Missing event" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    ));

    await expect(apiRequest("/events/missing")).rejects.toMatchObject({
      message: "Missing event",
      status: 404,
      path: "/events/missing",
      payload: { detail: "Missing event" }
    });
  });

  it("exposes status and path for 422 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ detail: [{ msg: "Invalid event id" }] }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    ));

    await expect(apiRequest("/events/invalid-id")).rejects.toMatchObject({
      message: "Invalid event id",
      status: 422,
      path: "/events/invalid-id",
      payload: { detail: [{ msg: "Invalid event id" }] }
    });
  });
});

describe("normalizeEvent", () => {
  it("normalizes object-shaped backend schedules to the array shape used by pages", () => {
    const event = normalizeEvent({
      id: "event-1",
      title: "Hackathon Prep Session",
      start_time: "2026-03-22T19:00:00+00:00",
      end_time: "2026-03-22T22:00:00+00:00",
      schedule: {
        start_time: "2026-03-22T19:00:00+00:00",
        end_time: "2026-03-22T22:00:00+00:00"
      }
    });

    expect(event.schedule).toEqual([{
      start_time: "2026-03-22T19:00:00+00:00",
      end_time: "2026-03-22T22:00:00+00:00",
      title: "Hackathon Prep Session"
    }]);
  });

  it("normalizes organizer name and email from backend event detail responses", () => {
    const event = normalizeEvent({
      id: "event-1",
      title: "Career Networking Night",
      start_time: "2026-03-20T01:00:00+00:00",
      end_time: "2026-03-20T03:00:00+00:00",
      organizer: {
        name: "Mina Patel",
        email: "mina@example.com"
      }
    });

    expect(event.organizer).toMatchObject({
      name: "Mina Patel",
      display_name: "Mina Patel",
      email: "mina@example.com"
    });
  });
});
