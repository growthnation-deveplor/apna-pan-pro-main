import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackApplication } from "@/lib/track-application.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/track")({
  component: TrackPage,
});

const statusVariants: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-700 border-red-500/30",
  completed: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  verified: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  under_verification: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  payment_pending: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  need_more_documents: "bg-pink-500/15 text-pink-700 border-pink-500/30",
  hold: "bg-orange-500/15 text-orange-700 border-orange-500/30",
};

function TrackPage() {
  const [appNo, setAppNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const fn = useServerFn(trackApplication);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!appNo.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await fn({ data: { application_no: appNo } });
      if (!data) {
        setError("Application not found. Please check your Application Number.");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to track application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-hero)] text-brand-foreground shadow-[var(--shadow-soft)]">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">Apna PAN Agency</div>
              <div className="text-[11px] text-muted-foreground">UTI / NSDL Supported</div>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 lg:py-20 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-3">Track Your Application</h1>
          <p className="text-muted-foreground">
            Enter the application number you received after submitting your documents to check the current status.
          </p>
        </div>

        <Card className="p-6 md:p-8 shadow-[var(--shadow-elegant)] border-border/50">
          <form onSubmit={handleTrack} className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="e.g. PAN-8A3B2C1D"
                value={appNo}
                onChange={(e) => setAppNo(e.target.value)}
                className="pl-10 h-12 text-lg uppercase"
                maxLength={20}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !appNo.trim()} className="px-8 h-12">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Track"}
            </Button>
          </form>

          {error && (
            <div className="rounded-lg bg-red-500/10 p-4 text-red-600 text-sm text-center border border-red-500/20">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="rounded-xl border bg-muted/30 p-6 text-center">
                <div className="text-sm text-muted-foreground mb-1">Status for Application</div>
                <div className="font-mono text-lg font-bold text-foreground mb-6">
                  {result.application_no}
                </div>
                
                <Badge className={`text-sm px-4 py-1.5 ${statusVariants[result.application_status] || ""}`} variant="outline">
                  {result.application_status?.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Applicant Name</div>
                  <div className="font-medium">{result.full_name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Submitted On</div>
                  <div className="font-medium">
                    {new Date(result.created_at).toLocaleDateString("en-IN", { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Payment Status</div>
                  <div className="font-medium flex items-center gap-1.5">
                    {result.payment_verified_at ? (
                      <><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Verified</>
                    ) : (
                      <><span className="h-2 w-2 rounded-full bg-amber-500"></span> Pending Verification</>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">
                    {result.status_updated_at ? new Date(result.status_updated_at).toLocaleDateString("en-IN") : "—"}
                  </div>
                </div>
              </div>

              {result.status_reason && (
                <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                  <h4 className="font-semibold text-amber-700 text-sm mb-1">Reason / Note from Admin</h4>
                  <p className="text-sm text-amber-800">{result.status_reason}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
