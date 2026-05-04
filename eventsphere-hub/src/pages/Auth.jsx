import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(80);

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const initialRole = params.get("role") === "organizer" ? "organizer" : "attendee";



  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState(initialRole);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    document.title = mode === "signin" ? "Sign in · Eventful" : "Sign up · Eventful";
  }, [mode]);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedEmail = emailSchema.safeParse(email);
      if (!parsedEmail.success) throw new Error(parsedEmail.error.issues[0].message);

      if (mode === "signup" && pendingConfirmation) {
        if (!confirmationCode.trim()) throw new Error("Enter the confirmation code.");
        await authApi.confirmSignUp({ email, code: confirmationCode.trim() });
        await authApi.login({ email, password });
        if (role === "organizer") {
          try {
            await usersApi.requestOrganizerUpgrade();
          } catch {
            // Ignore duplicate or unavailable request errors here; the profile page still exposes the action.
          }
        }
        toast({ title: "Account confirmed", description: "You're signed in now." });
      } else if (mode === "signup") {
        const parsedPassword = passwordSchema.safeParse(password);
        const parsedName = nameSchema.safeParse(displayName);
        if (!parsedPassword.success) throw new Error(parsedPassword.error.issues[0].message);
        if (!parsedName.success) throw new Error(parsedName.error.issues[0].message);

        const result = await authApi.signUp({
          name: displayName,
          email,
          password
        });
        if (role === "organizer") {
          toast({
            title: "Account created",
            description: "Confirm your email, then request organizer access from your profile."
          });
        } else {
          toast({
            title: "Check your email",
            description: result?.confirmation_required ? "Enter the confirmation code to finish signing up." : "Your account is ready."
          });
        }
        if (result?.confirmation_required) {
          setPendingConfirmation(true);
        } else {
          await authApi.login({ email, password });
          if (role === "organizer") {
            try {
              await usersApi.requestOrganizerUpgrade();
            } catch {
              // Ignore duplicate or unavailable request errors here; the profile page still exposes the action.
            }
          }
          navigate("/", { replace: true });
          return;
        }
      } else {
        const parsedPassword = passwordSchema.safeParse(password);
        if (!parsedPassword.success) throw new Error(parsedPassword.error.issues[0].message);
        await authApi.login({ email, password });
        toast({ title: "Signed in" });
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-subtle">
      <Card className="w-full max-w-md shadow-elevation-lg animate-fade-in">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow">
            <Calendar className="h-6 w-6" aria-hidden />
          </Link>
          <CardTitle className="text-2xl mt-4">Welcome to Eventful</CardTitle>
          <CardDescription>Discover events or host your own</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" &&
              <div className="space-y-2">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={80}
                  autoComplete="name" />
                
                </div>
              }
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email" />
                
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"} />
                
                {mode === "signup" &&
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                }
              </div>

              {mode === "signup" && pendingConfirmation &&
              <div className="space-y-2">
                  <Label htmlFor="confirmationCode">Confirmation code</Label>
                  <Input
                  id="confirmationCode"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Enter the code from your email"
                  autoComplete="one-time-code" />
                  <p className="text-xs text-muted-foreground">Your backend uses Cognito confirmation before first sign-in.</p>
                </div>
              }

              {mode === "signup" && !pendingConfirmation &&
              <div className="space-y-2">
                  <Label>I want to</Label>
                  <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v)}
                  className="grid grid-cols-2 gap-3">
                  
                    <Label
                    htmlFor="role-attendee"
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                    role === "attendee" ? "border-primary bg-primary/5" : "border-border"}`
                    }>
                    
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="role-attendee" value="attendee" />
                        <span className="font-semibold">Attend events</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Discover and RSVP</span>
                    </Label>
                    <Label
                    htmlFor="role-organizer"
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                    role === "organizer" ? "border-primary bg-primary/5" : "border-border"}`
                    }>
                    
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="role-organizer" value="organizer" />
                        <span className="font-semibold">Host events</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Create and manage</span>
                    </Label>
                  </RadioGroup>
                </div>
              }

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : pendingConfirmation ? "Confirm and sign in" : "Create account"}
              </Button>
            </form>

            <TabsContent value="signin" />
            <TabsContent value="signup" />
          </Tabs>
        </CardContent>
      </Card>
    </div>);

}
