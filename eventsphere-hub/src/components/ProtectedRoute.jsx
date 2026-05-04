import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({
  children,
  requireRole



}) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>);

  }

  if (!user) return <Navigate to="/auth?mode=signin" replace />;
  if (requireRole && !hasRole(requireRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
