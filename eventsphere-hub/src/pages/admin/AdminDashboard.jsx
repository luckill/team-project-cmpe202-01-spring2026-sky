import { useEffect, useState } from "react";
import { CheckCircle2, Shield, ShieldOff, UserPlus, Users as UsersIcon, Calendar as CalIcon, Loader2, XCircle } from "lucide-react";
import { adminApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatEventDate } from "@/lib/eventUtils";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [pending, setPending] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [organizerRequests, setOrganizerRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({ events: 0, users: 0, pending: 0, requests: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [processingUserId, setProcessingUserId] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [refreshState, setRefreshState] = useState({ key: 0, silent: false });

  useEffect(() => {
    let cancelled = false;
    const { silent } = refreshState;

    const load = async () => {
      if (!silent) {
        setLoading(true);
        setLoadError("");
      }
      try {
        const [pendingEvents, moderatedEvents, userList, requests, profile] = await Promise.all([
          adminApi.getPendingEvents(),
          adminApi.listAllEvents(),
          usersApi.listUsers(),
          adminApi.listOrganizerRequests(),
          usersApi.getProfile().catch(() => null)
        ]);

        if (cancelled) return;

        const nextPending = pendingEvents ?? [];
        const nextAllEvents = moderatedEvents ?? [];
        const nextUsers = userList ?? [];
        const nextRequests = requests ?? [];

        setPending(nextPending);
        setAllEvents(nextAllEvents);
        setUsers(nextUsers);
        setOrganizerRequests(nextRequests);
        setCurrentUser(profile);
        setStats({
          events: nextAllEvents.length,
          users: nextUsers.length,
          pending: nextPending.length,
          requests: nextRequests.length
        });
      } catch (error) {
        if (cancelled) return;

        if (!silent) {
          setPending([]);
          setAllEvents([]);
          setUsers([]);
          setOrganizerRequests([]);
          setStats({ events: 0, users: 0, pending: 0, requests: 0 });
          setLoadError(error instanceof Error ? error.message : "Could not load the admin dashboard.");
        }
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshState, toast]);
  useEffect(() => { document.title = "Admin · Eventful"; }, []);

  const refreshDashboard = ({ silent = false } = {}) => {
    setRefreshState((current) => ({
      key: current.key + 1,
      silent
    }));
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === "approved") await adminApi.approveEvent(id);
      else if (status === "rejected") {
        const event = pending.find((item) => item.id === id) ?? allEvents.find((item) => item.id === id) ?? { id };
        setRejectingEvent(event);
        setRejectionReason(event.rejection_reason ?? "");
        return;
      } else throw new Error("Only approve and reject are supported by the current API.");

      toast({ title: `Event ${status}` });
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const submitRejection = async () => {
    const reason = rejectionReason.trim();
    if (!rejectingEvent || !reason) {
      toast({ title: "Reason required", description: "Enter a rejection reason before rejecting this event.", variant: "destructive" });
      return;
    }

    setSubmittingRejection(true);
    try {
      await adminApi.rejectEvent(rejectingEvent.id, reason);
      toast({ title: "Event rejected" });
      setRejectingEvent(null);
      setRejectionReason("");
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingRejection(false);
    }
  };

  const promoteUser = async (user) => {
    setProcessingUserId(user.id);
    try {
      await adminApi.promoteUser(user.id);
      toast({ title: "User promoted to admin" });
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingUserId(null);
    }
  };

  const revokeAdmin = async (user) => {
    setProcessingUserId(user.id);
    try {
      await adminApi.revokeAdmin(user.id);
      toast({ title: "Admin role revoked" });
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingUserId(null);
    }
  };

  const approveOrganizerRequest = async (request) => {
    setProcessingRequestId(request.id);
    try {
      await adminApi.approveOrganizerRequest(request.id);
      toast({ title: "Organizer request approved" });
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const rejectOrganizerRequest = async (request) => {
    setProcessingRequestId(request.id);
    try {
      await adminApi.rejectOrganizerRequest(request.id);
      toast({ title: "Organizer request rejected" });
      refreshDashboard({ silent: true });
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (loading) return <div className="container py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  if (loadError) {
    return (
      <div className="container py-8 md:py-10">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Admin</h1>
        </div>
        <p className="text-muted-foreground mb-8">Moderate events and manage users</p>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold">Could not load the admin dashboard</p>
            <p className="mt-2 text-muted-foreground">{loadError}</p>
            <Button className="mt-4" onClick={() => refreshDashboard()}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-10">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">Admin</h1>
      </div>
      <p className="text-muted-foreground mb-8">Moderate events and manage users</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Events" value={stats.events} icon={CalIcon} />
        <StatCard label="Pending events" value={stats.pending} icon={CalIcon} accent />
        <StatCard label="Users" value={stats.users} icon={UsersIcon} />
        <StatCard label="Organizer requests" value={stats.requests} icon={UserPlus} />
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="h-auto flex flex-wrap">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="events">All events</TabsTrigger>
          <TabsTrigger value="requests">Organizer requests ({organizerRequests.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Pending events</CardTitle></CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <EmptyState>All caught up - no pending events.</EmptyState>
              ) : (
                <EventTable events={pending} renderActions={(event) => (
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Approve" onClick={() => updateStatus(event.id, "approved")}>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Reject" onClick={() => updateStatus(event.id, "rejected")}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader><CardTitle>All events</CardTitle></CardHeader>
            <CardContent>
              {allEvents.length === 0 ? (
                <EmptyState>No events available.</EmptyState>
              ) : (
                <EventTable events={allEvents} renderActions={(event) => (
                  <div className="flex justify-end gap-1">
                    <Select value={event.status} onValueChange={(value) => updateStatus(event.id, value)}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending" disabled>Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="cancelled" disabled>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Organizer requests</CardTitle></CardHeader>
            <CardContent>
              {organizerRequests.length === 0 ? (
                <EmptyState>No pending organizer requests.</EmptyState>
              ) : (
                <OrganizerRequestTable
                  requests={organizerRequests}
                  processingRequestId={processingRequestId}
                  onApprove={approveOrganizerRequest}
                  onReject={rejectOrganizerRequest}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Users</CardTitle></CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <EmptyState>No users found.</EmptyState>
              ) : (
                <UserTable
                  users={users}
                  currentUserId={currentUser?.id}
                  processingUserId={processingUserId}
                  onPromote={promoteUser}
                  onRevoke={revokeAdmin}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(rejectingEvent)} onOpenChange={(open) => {
        if (!open && !submittingRejection) {
          setRejectingEvent(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject event</DialogTitle>
            <DialogDescription>
              This reason will be saved with the event and shown to the organizer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">{rejectingEvent?.title ?? "Selected event"}</p>
            <Textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Explain why this event cannot be approved yet."
              maxLength={500}
              disabled={submittingRejection}
            />
            <p className="text-xs text-muted-foreground text-right">{rejectionReason.length}/500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingEvent(null);
                setRejectionReason("");
              }}
              disabled={submittingRejection}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitRejection}
              disabled={submittingRejection || !rejectionReason.trim()}
            >
              {submittingRejection && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{children}</p>;
}

function EventTable({ events, renderActions }) {
  const styles = {
    approved: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning",
    rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    pending_approval: "bg-warning/15 text-warning"
  };
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Organizer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell className="text-sm">{event.organizer_name ?? "Unknown"}</TableCell>
              <TableCell className="text-sm">{formatEventDate(event.start_at)}</TableCell>
              <TableCell><Badge className={`${styles[event.status]} capitalize`}>{event.status}</Badge></TableCell>
              <TableCell className="text-right">{renderActions(event)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrganizerRequestTable({ requests, processingRequestId, onApprove, onReject }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const isProcessing = processingRequestId === request.id;
            return (
              <TableRow key={request.id}>
                <TableCell>
                  <div className="font-medium">{request.user_name ?? "Unknown user"}</div>
                  <div className="text-sm text-muted-foreground">{request.user_email ?? "No email"}</div>
                </TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">{request.message ?? "No message"}</TableCell>
                <TableCell className="text-sm">{formatAdminDate(request.created_at)}</TableCell>
                <TableCell><Badge className="bg-warning/15 text-warning capitalize">{request.status ?? "pending"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label="Approve organizer request" disabled={isProcessing} onClick={() => onApprove(request)}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Reject organizer request" disabled={isProcessing} onClick={() => onReject(request)}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function UserTable({ users, currentUserId, processingUserId, onPromote, onRevoke }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = Boolean(currentUserId) && user.id === currentUserId;
            const isProcessing = processingUserId === user.id;
            const isAdmin = user.role === "admin";
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{user.name ?? "Unnamed user"}</span>
                    {isSelf && <Badge variant="outline">You</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell>
                  <Badge className={user.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{formatAdminDate(user.created_at)}</TableCell>
                <TableCell className="text-right">
                  {isAdmin ? (
                    <Button variant="outline" size="sm" disabled={isSelf || isProcessing} onClick={() => onRevoke(user)}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Revoke admin
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled={isSelf || isProcessing} onClick={() => onPromote(user)}>
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Promote
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "bg-primary/15 text-primary",
    organizer: "bg-accent/70 text-accent-foreground",
    attendee: "bg-secondary text-secondary-foreground"
  };
  return <Badge className={`${styles[role] ?? "bg-muted text-muted-foreground"} capitalize`}>{role ?? "unknown"}</Badge>;
}

function formatAdminDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
