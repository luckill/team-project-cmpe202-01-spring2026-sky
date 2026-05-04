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
        <Route path="/organizer/events/new" element={<EventForm />} />
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

  it("parses legacy 3-part addresses without a state value", async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      id: "legacy-event",
      title: "Legacy Event",
      description: "",
      category_id: null,
      start_at: "2026-06-01T17:00:00.000Z",
      end_at: "2026-06-01T18:00:00.000Z",
      venue_name: "Student Union",
      location_address: "123 First St, San Jose, United States",
      capacity: 50
    });

    renderEventForm("/organizer/events/legacy-event/edit");

    expect(await screen.findByDisplayValue("123 First St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("San Jose")).toBeInTheDocument();
    expect(screen.getByLabelText("State")).toHaveValue("");
    expect(screen.getByDisplayValue("United States")).toBeInTheDocument();
  });

  it("parses 4-part addresses with a state value", async () => {
    vi.mocked(eventsApi.getEvent).mockResolvedValue({
      id: "modern-event",
      title: "Modern Event",
      description: "",
      category_id: null,
      start_at: "2026-06-01T17:00:00.000Z",
      end_at: "2026-06-01T18:00:00.000Z",
      venue_name: "Student Union",
      location_address: "123 First St, San Jose, CA, United States",
      capacity: 50
    });

    renderEventForm("/organizer/events/modern-event/edit");

    expect(await screen.findByDisplayValue("123 First St")).toBeInTheDocument();
    expect(screen.getByDisplayValue("San Jose")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("United States")).toBeInTheDocument();
  });

  it("submits state inside the composed location_address", async () => {
    vi.mocked(eventsApi.createEvent).mockResolvedValue({ message: "ok" });

    renderEventForm("/organizer/events/new");

    await screen.findByLabelText("Title *");

    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Future Meetup" } });
    fireEvent.change(screen.getByLabelText("Starts *"), { target: { value: "2026-07-10T18:00" } });
    fireEvent.change(screen.getByLabelText("Ends *"), { target: { value: "2026-07-10T20:00" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "123 First St" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "San Jose" } });
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "CA" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "United States" } });

    fireEvent.click(screen.getByRole("button", { name: /Submit for review/i }));

    await waitFor(() => {
      expect(eventsApi.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          location_address: "123 First St, San Jose, CA, United States"
        })
      );
    });
  });
});
