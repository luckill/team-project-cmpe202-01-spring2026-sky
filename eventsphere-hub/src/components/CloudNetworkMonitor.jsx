import { useEffect, useMemo, useState } from "react";
import { Activity, Cloud, Server, X } from "lucide-react";
import { API_BASE_URL, NETWORK_EVENT_NAME } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_ENTRIES = 12;

function inferApiProvider(url) {
  if (!url) return "Not configured";
  if (url.includes("execute-api.")) return "AWS API Gateway";
  return "Custom API endpoint";
}

function inferAwsRegion(url) {
  const match = url.match(/execute-api\.([^.]+)\.amazonaws\.com/);
  return match?.[1] ?? null;
}

export default function CloudNetworkMonitor() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);

  const authTokenType = import.meta.env.VITE_AUTH_TOKEN_TYPE ?? "access";

  const apiProvider = useMemo(() => inferApiProvider(API_BASE_URL), []);
  const awsRegion = useMemo(() => inferAwsRegion(API_BASE_URL), []);

  useEffect(() => {
    const onNetworkEvent = (event) => {
      const detail = event?.detail;
      if (!detail) return;
      setEntries((current) => [detail, ...current].slice(0, MAX_ENTRIES));
    };

    window.addEventListener(NETWORK_EVENT_NAME, onNetworkEvent);
    return () => window.removeEventListener(NETWORK_EVENT_NAME, onNetworkEvent);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <Card className="w-[min(92vw,28rem)] shadow-elevation-lg border-primary/20">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cloud className="h-4 w-4 text-primary" />
                  Cloud monitor
                </CardTitle>
                <CardDescription>
                  Live request activity and frontend-visible cloud configuration.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close cloud monitor">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Server className="h-4 w-4 text-primary" />
                Backend API
              </div>
              <div className="rounded-lg border bg-secondary/35 p-3 text-sm">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="secondary">{apiProvider}</Badge>
                  {awsRegion && <Badge variant="outline">{awsRegion}</Badge>}
                  <Badge variant="outline">token: {authTokenType}</Badge>
                </div>
                <p className="break-all font-mono text-xs text-foreground/90">
                  {API_BASE_URL || "No API base URL configured"}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-primary" />
                Recent calls
              </div>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Browse events, open an event detail page, or use the organizer/admin tools to populate live calls here.
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.ok ? "secondary" : "destructive"}>{entry.method}</Badge>
                          <span className="font-medium">{entry.status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{entry.duration_ms} ms</span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-foreground/90">{entry.url}</p>
                      {!entry.ok && entry.error && (
                        <p className="mt-1 text-xs text-destructive">{entry.error}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      )}

      <Button
        type="button"
        size="sm"
        className="shadow-elevation-md"
        onClick={() => setOpen((current) => !current)}
      >
        <Cloud className="h-4 w-4" />
        Cloud monitor
      </Button>
    </div>
  );
}
