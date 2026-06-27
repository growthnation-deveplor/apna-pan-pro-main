import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackApplication } from "@/lib/track-application.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
      // Small artificial delay to show off the fancy new loading state 
      // (remove in production if you want it instantly)
      await new Promise(resolve => setTimeout(resolve, 800));
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
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight">Apna PAN Agency</div>
              <div className="text-[11px] text-muted-foreground transition-colors group-hover:text-primary/80">UTI / NSDL Supported</div>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 lg:py-20 max-w-2xl relative z-10">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-6">
            <Search className="mr-2 h-4 w-4" /> Live Tracking
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Track Your Application
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Enter your application number to instantly check the current status of your PAN card processing.
          </p>
        </div>

        <Card className="p-6 md:p-8 shadow-2xl shadow-primary/5 border-border/40 bg-background/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary to-blue-500 opacity-0 transition-opacity duration-500 group-focus-within:opacity-20 blur-md -z-10"></div>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="e.g. PAN-8A3B2C1D"
                value={appNo}
                onChange={(e) => setAppNo(e.target.value)}
                className="pl-12 h-14 text-lg uppercase bg-background/80 border-border/50 focus-visible:ring-primary/50 rounded-xl"
                maxLength={20}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !appNo.trim()} className="px-8 h-14 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Tracking...
                </>
              ) : (
                "Track Now"
              )}
            </Button>
          </form>

          {error && (
            <div className="rounded-xl bg-red-500/10 p-5 text-red-600 text-sm text-center border border-red-500/20 animate-in fade-in zoom-in-95 duration-300 flex items-center justify-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-600 font-bold shrink-0">!</span>
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-6 flex flex-col items-center">
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-8 w-48 mb-6" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2 p-4 rounded-xl border border-border/30 bg-muted/10">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-500">
              <div className="rounded-2xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted/10 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500 opacity-50"></div>
                <div className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wider">Status for Application</div>
                <div className="font-mono text-2xl font-bold text-foreground mb-6 tracking-tight">
                  {result.application_no}
                </div>
                
                <Badge className={`text-sm px-5 py-2 uppercase tracking-wider font-semibold shadow-sm ${statusVariants[result.application_status] || ""}`} variant="outline">
                  {result.application_status?.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 p-4 rounded-xl border border-border/30 bg-card hover:bg-accent/50 transition-colors">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    Applicant Name
                  </div>
                  <div className="font-semibold text-base">{result.full_name}</div>
                </div>
                <div className="space-y-1.5 p-4 rounded-xl border border-border/30 bg-card hover:bg-accent/50 transition-colors">
                  <div className="text-sm font-medium text-muted-foreground">Submitted On</div>
                  <div className="font-semibold text-base">
                    {new Date(result.created_at).toLocaleDateString("en-IN", { 
                      day: 'numeric', month: 'short', year: 'numeric' 
                    })}
                  </div>
                </div>
                <div className="space-y-1.5 p-4 rounded-xl border border-border/30 bg-card hover:bg-accent/50 transition-colors">
                  <div className="text-sm font-medium text-muted-foreground">Payment Status</div>
                  <div className="font-semibold text-base flex items-center gap-2">
                    {result.payment_verified_at ? (
                      <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span> Verified</>
                    ) : (
                      <><span className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span> Pending</>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 p-4 rounded-xl border border-border/30 bg-card hover:bg-accent/50 transition-colors">
                  <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                  <div className="font-semibold text-base">
                    {result.status_updated_at ? new Date(result.status_updated_at).toLocaleDateString("en-IN", {
                      day: 'numeric', month: 'short', year: 'numeric'
                    }) : "—"}
                  </div>
                </div>
              </div>

              {result.status_reason && (
                <div className="mt-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 shadow-sm">
                  <h4 className="font-semibold text-amber-700 text-sm mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-xs">i</span>
                    Reason / Note from Admin
                  </h4>
                  <p className="text-sm text-amber-800 leading-relaxed">{result.status_reason}</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
