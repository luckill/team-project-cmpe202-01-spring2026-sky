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
    deleteEvent: vi.fn()
  }
}));

describe("OrganizerDashboard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "organizer-1" } });
  });

  afterEach(() => {
    vi.clearAllMocks();
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
});
