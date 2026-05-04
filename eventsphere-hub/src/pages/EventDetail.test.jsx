import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetail from "./EventDetail";
import { useAuth } from "@/hooks/useAuth";
import { eventsApi, rsvpApi } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock("@/lib/api", () => ({
  eventsApi: {
    getEvent: vi.fn()
  },
  rsvpApi: {
    mine: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn()
  }
}));

function createApiError(message, status, path) {
  return Object.assign(new Error(message), { status, path });
}

function renderEventDetail(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/events/:id" element={<EventDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EventDetail", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, roles: [] });
    vi.mocked(rsvpApi.mine).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows not-found messaging for 404 event responses", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Missing event", 404, "/events/missing")
    );

    renderEventDetail("/events/missing");

    expect(await screen.findByRole("heading", { name: "Event not found" })).toBeInTheDocument();
    expect(screen.getByText("This event may have been removed or is no longer available.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to browse/i })).toBeInTheDocument();
  });

  it("shows invalid-link messaging for 422 event responses", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Invalid event id", 422, "/events/invalid-id")
    );

    renderEventDetail("/events/invalid-id");

    expect(await screen.findByRole("heading", { name: "Invalid event link" })).toBeInTheDocument();
    expect(screen.getByText("This event link is invalid or incomplete. Go back to browse and choose another event.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to browse/i })).toBeInTheDocument();
  });

  it("keeps generic failures retryable", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Temporary outage", 500, "/events/outage")
    );

    renderEventDetail("/events/outage");

    expect(await screen.findByText("Temporary outage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(eventsApi.getEvent).toHaveBeenCalledTimes(2);
    });
  });
});
