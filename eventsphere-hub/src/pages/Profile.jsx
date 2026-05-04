import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestingOrganizer, setRequestingOrganizer] = useState(false);

  useEffect(() => {document.title = "Profile · Eventful";}, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await usersApi.getProfile();
        if (data) {
          setDisplayName(data.display_name ?? data.name ?? user.name ?? "");
        } else {
          setDisplayName(user.name ?? "");
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load your profile.");
        setDisplayName(user.name ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const schema = z.object({
      name: z.string().trim().min(1).max(80)
    });
    const parsed = schema.safeParse({ name: displayName });
    if (!parsed.success) {
      toast({ title: "Error", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({ name: parsed.data.name });
      setDisplayName(updated?.display_name ?? updated?.name ?? parsed.data.name);
      toast({ title: "Profile updated" });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error.message ?? "Could not update your profile.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const requestOrganizerAccess = async () => {
    setRequestingOrganizer(true);
    try {
      await usersApi.requestOrganizerUpgrade();
      toast({
        title: "Organizer request sent",
        description: "An admin will need to approve your upgrade."
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: error.message ?? "Could not submit the organizer request.",
        variant: "destructive"
      });
    } finally {
      setRequestingOrganizer(false);
    }
  };

  if (loading) return <div className="container py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="container py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {roles.map((r) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError &&
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {loadError}
            </div>
          }
          <div className="space-y-2">
            <Label htmlFor="dn">Name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </Button>
          {!roles.includes("organizer") && !roles.includes("admin") &&
          <Button variant="outline" onClick={requestOrganizerAccess} disabled={requestingOrganizer}>
              {requestingOrganizer && <Loader2 className="h-4 w-4 animate-spin" />} Request organizer access
            </Button>
          }
        </CardContent>
      </Card>
    </div>);

}
