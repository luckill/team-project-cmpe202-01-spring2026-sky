import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventForm from "./EventForm";
import { useAuth } from "@/hooks/useAuth";
import { eventsApi } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() })
}));

vi.mock("@/lib/api", () => ({
  eventsApi: {
    listCategories: vi.fn(),
    getEvent: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn()
  }
}));

function createApiError(message, status, path) {
  return Object.assign(new Error(message), { status, path });
}

function renderEventForm(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/organizer/events/:id/edit" element={<EventForm />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("EventForm", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "organizer-1" } });
    vi.mocked(eventsApi.listCategories).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows edit-specific not-found messaging for 404 event responses", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Missing event", 404, "/events/missing")
    );

    renderEventForm("/organizer/events/missing/edit");

    expect(await screen.findByText("Event not found")).toBeInTheDocument();
    expect(screen.getByText("This event no longer exists or is no longer available to edit.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toBeInTheDocument();
  });

  it("shows edit-specific invalid-link messaging for 422 event responses", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Invalid event id", 422, "/events/invalid-id")
    );

    renderEventForm("/organizer/events/invalid-id/edit");

    expect(await screen.findByText("Invalid event link")).toBeInTheDocument();
    expect(screen.getByText("This edit link is invalid or incomplete. Return to your dashboard and open the event again.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toBeInTheDocument();
  });

  it("keeps generic edit-load failures retryable", async () => {
    vi.mocked(eventsApi.getEvent).mockRejectedValue(
      createApiError("Temporary outage", 500, "/events/outage")
    );

    renderEventForm("/organizer/events/outage/edit");

    expect(await screen.findByText("Temporary outage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(eventsApi.listCategories).toHaveBeenCalledTimes(2);
      expect(eventsApi.getEvent).toHaveBeenCalledTimes(2);
    });
  });
});
