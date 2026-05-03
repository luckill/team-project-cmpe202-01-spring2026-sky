import { Link, NavLink, useNavigate } from "react-router-dom";
import { Calendar, Search, Menu, User as UserIcon, LogOut, LayoutDashboard, Ticket, Shield, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Header() {
  const { user, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const onSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
    setOpen(false);
  };

  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-glow">
            <Calendar className="h-5 w-5" aria-hidden />
          </div>
          <span className="text-xl font-extrabold tracking-tight hidden sm:inline">Eventful</span>
        </Link>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-md" role="search">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="pl-9 rounded-full bg-secondary border-transparent focus-visible:bg-background"
              aria-label="Search events" />
            
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1 ml-auto">
          <NavLink
            to="/browse"
            className={({ isActive }) =>
            `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? "text-primary" : "text-foreground hover:text-primary"}`

            }>
            
            Browse
          </NavLink>

          {user && hasRole("organizer") &&
          <Button asChild variant="ghost" size="sm">
              <Link to="/organizer/events/new">
                <Plus className="h-4 w-4" /> Create event
              </Link>
            </Button>
          }

          {!user ?
          <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth?mode=signin">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth?mode=signup">Sign up</Link>
              </Button>
            </> :

          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/tickets")}>
                  <Ticket className="h-4 w-4" /> My tickets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserIcon className="h-4 w-4" /> Profile
                </DropdownMenuItem>
                {hasRole("organizer") &&
              <DropdownMenuItem onClick={() => navigate("/organizer")}>
                    <LayoutDashboard className="h-4 w-4" /> Organizer
                  </DropdownMenuItem>
              }
                {hasRole("admin") &&
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4" /> Admin
                  </DropdownMenuItem>
              }
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        </nav>

        {/* Mobile */}
        <div className="flex md:hidden ml-auto items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Search">
            <Link to="/browse">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <form onSubmit={onSearch} className="mt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search events..."
                    className="pl-9"
                    aria-label="Search events" />
                  
                </div>
              </form>
              <nav className="mt-6 flex flex-col gap-1">
                <Link to="/browse" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10 font-medium">
                  Browse events
                </Link>
                {user &&
                <>
                    <Link to="/tickets" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">
                      My tickets
                    </Link>
                    <Link to="/profile" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">
                      Profile
                    </Link>
                    {hasRole("organizer") &&
                  <>
                        <Link to="/organizer" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">
                          Organizer dashboard
                        </Link>
                        <Link to="/organizer/events/new" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">
                          Create event
                        </Link>
                      </>
                  }
                    {hasRole("admin") &&
                  <Link to="/admin" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md hover:bg-accent/10">
                        Admin
                      </Link>
                  }
                  </>
                }
                <div className="my-2 h-px bg-border" />
                {!user ?
                <>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/auth?mode=signin">Sign in</Link>
                    </Button>
                    <Button asChild onClick={() => setOpen(false)}>
                      <Link to="/auth?mode=signup">Sign up</Link>
                    </Button>
                  </> :

                <Button variant="outline" onClick={() => {setOpen(false);signOut();}}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                }
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>);

}