import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrganizerDashboard from "./OrganizerDashboard";
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
    getOrganizerEvents: vi.fn(),
    cancelEvent: vi.fn()
  }
}));

describe("OrganizerDashboard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "organizer-1" } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("keeps dashboard load failures retryable", async () => {
    vi.mocked(eventsApi.getOrganizerEvents).mockRejectedValue(new Error("Dashboard unavailable"));

    render(
      <MemoryRouter>
        <OrganizerDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Could not load your organizer dashboard")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(eventsApi.getOrganizerEvents).toHaveBeenCalledTimes(2);
    });
  });

  it("cancels events and refreshes the dashboard", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(eventsApi.getOrganizerEvents)
      .mockResolvedValueOnce([
        {
          id: "event-1",
          title: "Launch Night",
          start_at: "2026-07-10T18:00:00.000Z",
          status: "approved",
          registration_count: 12,
          capacity: 50
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "event-1",
          title: "Launch Night",
          start_at: "2026-07-10T18:00:00.000Z",
          status: "cancelled",
          registration_count: 12,
          capacity: 50
        }
      ]);
    vi.mocked(eventsApi.cancelEvent).mockResolvedValue({ message: "Event cancelled" });

    render(
      <MemoryRouter>
        <OrganizerDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText("Launch Night")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel event" }));

    await waitFor(() => {
      expect(eventsApi.cancelEvent).toHaveBeenCalledWith("event-1");
      expect(eventsApi.getOrganizerEvents).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByRole("button", { name: "Event already cancelled" })).toBeDisabled();
  });
});
