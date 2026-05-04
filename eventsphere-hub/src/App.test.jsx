import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }) => <>{children}</>
}));

vi.mock("@/components/layout/Layout", () => ({
  default: ({ children }) => <>{children}</>
}));

vi.mock("@/components/CloudNetworkMonitor", () => ({
  default: () => null
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => null
}));

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => null
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }) => <>{children}</>
}));

vi.mock("./pages/Home", () => ({ default: () => <div>HOME PAGE</div> }));
vi.mock("./pages/Browse", () => ({ default: () => <div>BROWSE PAGE</div> }));
vi.mock("./pages/EventDetail", () => ({ default: () => <div>EVENT DETAIL PAGE</div> }));
vi.mock("./pages/Auth", () => ({ default: () => <div>AUTH PAGE</div> }));
vi.mock("./pages/MyTickets", () => ({ default: () => <div>REGISTRATIONS PAGE</div> }));
vi.mock("./pages/Profile", () => ({ default: () => <div>PROFILE PAGE</div> }));
vi.mock("./pages/organizer/OrganizerDashboard", () => ({ default: () => <div>ORGANIZER PAGE</div> }));
vi.mock("./pages/organizer/EventForm", () => ({ default: () => <div>EVENT FORM PAGE</div> }));
vi.mock("./pages/organizer/AttendeeList", () => ({ default: () => <div>ATTENDEE LIST PAGE</div> }));
vi.mock("./pages/admin/AdminDashboard", () => ({ default: () => <div>ADMIN PAGE</div> }));
vi.mock("./pages/NotFound", () => ({ default: () => <div>NOT FOUND PAGE</div> }));

function mockAuth(roles) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "user-1", email: "user@example.com" },
    loading: false,
    roles,
    hasRole: (role) => roles.includes(role),
    signOut: vi.fn()
  });
}

function renderAt(path, roles) {
  window.history.pushState({}, "", path);
  mockAuth(roles);
  return render(<App />);
}

describe("App role routes", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("blocks admin users from organizer routes", async () => {
    renderAt("/organizer", ["admin"]);

    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
    expect(screen.queryByText("ORGANIZER PAGE")).not.toBeInTheDocument();
  });

  it("blocks organizer users from admin routes", async () => {
    renderAt("/admin", ["organizer"]);

    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN PAGE")).not.toBeInTheDocument();
  });

  it("blocks non-attendees from the registrations route", async () => {
    renderAt("/tickets", ["admin"]);

    expect(await screen.findByText("HOME PAGE")).toBeInTheDocument();
    expect(screen.queryByText("REGISTRATIONS PAGE")).not.toBeInTheDocument();
  });

  it("allows attendees to access the registrations route", async () => {
    renderAt("/tickets", ["attendee"]);

    expect(await screen.findByText("REGISTRATIONS PAGE")).toBeInTheDocument();
  });
});
