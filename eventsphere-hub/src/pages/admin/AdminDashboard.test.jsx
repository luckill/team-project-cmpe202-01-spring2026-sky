import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";
import { adminApi, usersApi } from "@/lib/api";

const toast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast })
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button type="button">{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>
}));

vi.mock("@/lib/api", () => ({
  adminApi: {
    getPendingEvents: vi.fn(),
    listAllEvents: vi.fn(),
    approveEvent: vi.fn(),
    rejectEvent: vi.fn(),
    promoteUser: vi.fn(),
    revokeAdmin: vi.fn(),
    listOrganizerRequests: vi.fn(),
    approveOrganizerRequest: vi.fn(),
    rejectOrganizerRequest: vi.fn()
  },
  usersApi: {
    listUsers: vi.fn(),
    getProfile: vi.fn()
  }
}));

describe("AdminDashboard user actions", () => {
  beforeEach(() => {
    vi.mocked(adminApi.getPendingEvents).mockResolvedValue([]);
    vi.mocked(adminApi.listAllEvents).mockResolvedValue([]);
    vi.mocked(adminApi.listOrganizerRequests).mockResolvedValue([]);
    vi.mocked(usersApi.getProfile).mockResolvedValue({ id: "admin-1" });
    vi.mocked(usersApi.listUsers).mockResolvedValue([
      {
        id: "attendee-1",
        name: "Attendee User",
        email: "attendee@example.com",
        role: "attendee",
        is_active: true,
        created_at: "2026-05-01T10:00:00.000Z"
      },
      {
        id: "organizer-1",
        name: "Organizer User",
        email: "organizer@example.com",
        role: "organizer",
        is_active: true,
        created_at: "2026-05-01T10:00:00.000Z"
      },
      {
        id: "admin-1",
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        is_active: true,
        created_at: "2026-05-01T10:00:00.000Z"
      }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("only exposes promote for attendee users", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    const attendeeRow = (await screen.findByText("Attendee User")).closest("tr");
    const organizerRow = screen.getByText("Organizer User").closest("tr");

    expect(within(attendeeRow).getByRole("button", { name: /Promote/i })).toBeInTheDocument();
    expect(within(organizerRow).queryByRole("button", { name: /Promote/i })).not.toBeInTheDocument();
    expect(within(organizerRow).getByText("Attendee only")).toBeInTheDocument();
  });
});
