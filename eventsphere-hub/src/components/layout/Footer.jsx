import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30 mt-20">
      <div className="container py-10 grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground">
              <Calendar className="h-4 w-4" aria-hidden />
            </div>
            <span className="font-extrabold">Eventful</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Discover and host events that matter.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Discover</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/browse" className="hover:text-foreground">Browse events</Link></li>
            <li><Link to="/browse?free=1" className="hover:text-foreground">Free events</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Organize</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth?mode=signup&role=organizer" className="hover:text-foreground">Become an organizer</Link></li>
            <li><Link to="/organizer" className="hover:text-foreground">Organizer dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3">Account</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/auth?mode=signin" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/tickets" className="hover:text-foreground">My tickets</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Eventful. All rights reserved.
        </div>
      </div>
    </footer>);

}