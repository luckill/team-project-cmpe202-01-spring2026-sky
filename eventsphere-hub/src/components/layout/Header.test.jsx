import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn()
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }) => <button type="button" onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }) => <div>{children}</div>,
  SheetTrigger: ({ children }) => <div>{children}</div>,
  SheetContent: ({ children }) => <div>{children}</div>
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }) => <div>{children}</div>,
  AvatarFallback: ({ children }) => <div>{children}</div>
}));

function renderHeader(roles) {
  vi.mocked(useAuth).mockReturnValue({
    user: { email: "user@example.com" },
    hasRole: (role) => roles.includes(role),
    signOut: vi.fn()
  });

  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
}

describe("Header role-aware menus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hides My registrations for admin users", () => {
    renderHeader(["admin"]);

    expect(screen.queryByText("My registrations")).not.toBeInTheDocument();
  });

  it("shows My registrations for attendee users", () => {
    renderHeader(["attendee"]);

    expect(screen.getAllByText("My registrations")).toHaveLength(2);
  });
});
