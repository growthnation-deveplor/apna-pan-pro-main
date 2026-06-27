import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetApplication,
  adminUpdateStatus,
  adminVerifyPayment,
  adminAddNote,
  adminDeleteApplication,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  FileImage,
  FileText,
  Loader2,
  Eye,
  ExternalLink,
  Trash2,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Hash,
  MessageSquare,
  Clock,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/applications/$id")({
  component: AppDetail,
});

const STATUSES = [
  "pending",
  "under_verification",
  "need_more_documents",
  "payment_pending",
  "verified",
  "approved",
  "rejected",
  "completed",
  "refund",
];

const formatDateIST = (dateStr: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(dateStr));

function Field({ label, value, icon: Icon }: { label: string; value: any, icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col space-y-1.5 p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/40 hover:border-border/80 transition-all hover:shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary/60" />}
        {label}
      </div>
      <div className="text-[15px] font-semibold break-words text-foreground/90">{value || "—"}</div>
    </div>
  );
}

function getFileKind(url: string): "pdf" | "image" | "other" {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (/\.(jpe?g|png|webp|gif|bmp|heic|heif|svg)$/i.test(path)) return "image";
    return "other";
  } catch {
    return "other";
  }
}

function DocCard({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <Card className="p-4 border-dashed bg-muted/10">
        <div className="text-sm font-medium mb-3 text-muted-foreground">{label}</div>
        <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 flex flex-col items-center justify-center text-xs text-muted-foreground/50 gap-2">
          <FileImage className="h-8 w-8 opacity-20" />
          Not uploaded
        </div>
      </Card>
    );
  }
  const kind = getFileKind(url);
  return (
    <Card className="p-3 space-y-3 group overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all hover:border-primary/30 bg-background/50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <div className={cn("p-2 rounded-lg", kind === 'pdf' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500')}>
             {kind === "pdf" ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}
          </div>
          <span className="truncate tracking-tight">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={url} target="_blank" rel="noreferrer" title="Open in new tab">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <a href={url} download title="Download">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button className="block w-full text-left relative group/btn">
            <div className="aspect-[4/3] rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center overflow-hidden relative shadow-inner">
              {kind === "image" ? (
                <img src={url} alt={label} className="h-full w-full object-cover transition-transform duration-700 group-hover/btn:scale-110" />
              ) : kind === "pdf" ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground/60 transition-transform duration-500 group-hover/btn:scale-105">
                  <FileText className="h-12 w-12 text-rose-500/40" />
                  <span className="text-xs font-medium">PDF Document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="h-10 w-10 opacity-40" />
                  <span className="text-xs">Open file</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 opacity-0 group-hover/btn:opacity-100 transition-all duration-300">
                <span className="inline-flex items-center justify-center gap-1.5 text-white text-xs font-bold translate-y-4 group-hover/btn:translate-y-0 transition-transform duration-300">
                  <Eye className="h-4 w-4" /> PREVIEW DOCUMENT
                </span>
              </div>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden rounded-3xl border-border/40 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/50 flex-row items-center justify-between space-y-0 backdrop-blur-md">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 tracking-tight">
               {kind === 'pdf' ? <FileText className="h-5 w-5 text-rose-500" /> : <FileImage className="h-5 w-5 text-blue-500" />}
               {label}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="rounded-full shadow-sm font-semibold">
                  <ExternalLink className="h-4 w-4 mr-1.5" /> Open
                </Button>
              </a>
              <a href={url} download>
                <Button size="sm" className="rounded-full shadow-sm shadow-primary/20 font-semibold">
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </a>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-black/5 relative">
            {kind === "image" ? (
              <div className="min-h-full flex items-center justify-center p-8">
                <img src={url} alt={label} className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-md" />
              </div>
            ) : (
              <iframe
                src={url}
                title={label}
                className="w-full h-full border-0 bg-white"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AppDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetApplication);
  const updateFn = useServerFn(adminUpdateStatus);
  const verifyFn = useServerFn(adminVerifyPayment);
  const noteFn = useServerFn(adminAddNote);
  const deleteFn = useServerFn(adminDeleteApplication);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-app", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const verify = useMutation({
    mutationFn: (verify: boolean) => verifyFn({ data: { id, verify } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success("Payment updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: () => noteFn({ data: { application_id: id, note } }),
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success("Note added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState("");

  async function changeStatus(status: string) {
    if (status === "rejected" || status === "need_more_documents" || status === "hold" || status === "refund") {
      setPendingStatus(status);
      return;
    }
    await commitStatus(status, "");
  }

  async function commitStatus(status: string, reason: string) {
    setSavingStatus(true);
    setPendingStatus(null);
    try {
      await updateFn({ data: { id, status: status as any, status_reason: reason } });
      await qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingStatus(false);
      setStatusReason("");
    }
  }

  async function deleteApp() {
    if (!confirm("Are you sure you want to permanently delete this application?")) return;
    setIsDeleting(true);
    try {
      await deleteFn({ data: { id } });
      toast.success("Application deleted");
      navigate({ to: "/admin/applications" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-muted-foreground animate-in fade-in-50 zoom-in-95 duration-500">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin mb-6 text-primary relative z-10" />
        </div>
        <p className="text-base font-medium tracking-tight">Fetching Application Details...</p>
      </div>
    );
  }

  const app = data.app;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/applications"
          className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/40 hover:bg-muted/80 px-4 py-2 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to List
        </Link>
        <Button variant="destructive" size="sm" onClick={deleteApp} disabled={isDeleting} className="rounded-full shadow-sm shadow-red-500/20 font-semibold px-4">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />} Delete App
        </Button>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-background via-muted/30 to-muted/10 p-8 shadow-sm backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-[80px] -z-10" />
        
        <div className="flex flex-col lg:flex-row gap-6 lg:items-center lg:justify-between relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-widest mb-2">
              Application No. <span className="ml-2 px-1.5 py-0.5 bg-primary/20 rounded font-mono">{app.application_no || "—"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground/90">{app.full_name}</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4" /> Submitted on {formatDateIST(app.created_at)}
            </p>
          </div>
          
          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-md min-w-[280px]">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Update Status</div>
            <div className="flex gap-2 items-center w-full">
              <Select value={app.application_status} onValueChange={changeStatus}>
                <SelectTrigger className="w-full h-12 text-sm font-semibold rounded-xl bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="font-medium cursor-pointer">
                      {s.replace(/_/g, " ").toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savingStatus && (
                <div className="h-12 w-12 flex items-center justify-center shrink-0 rounded-xl bg-primary/10 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
            
            <Dialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">Reason for {pendingStatus?.replace(/_/g, " ")}</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Textarea
                    placeholder="Enter a detailed reason here (this will be visible to the customer)..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="min-h-[120px] resize-none text-base rounded-xl bg-muted/30"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={() => setPendingStatus(null)}>Cancel</Button>
                  <Button className="rounded-xl font-semibold shadow-md" onClick={() => commitStatus(pendingStatus!, statusReason)} disabled={!statusReason.trim()}>
                    Confirm Status Update
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Customer & Address Details */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <User className="w-32 h-32" />
              </div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><User className="h-5 w-5" /></div>
                Customer Info
              </h3>
              <div className="grid gap-4 relative z-10">
                <Field icon={User} label="Full name" value={app.full_name} />
                <Field icon={User} label="Father's name" value={app.father_name} />
                <Field icon={User} label="Mother's name" value={app.mother_name} />
                <Field icon={Mail} label="Email Address" value={app.email} />
                <Field icon={Phone} label="Customer Phone" value={app.customer_mobile} />
                <Field icon={ShieldCheck} label="Agency Registered Mobile" value={app.agency_mobile} />
              </div>
            </Card>

            <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <MapPin className="w-32 h-32" />
              </div>
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><MapPin className="h-5 w-5" /></div>
                Address Details
              </h3>
              <div className="grid gap-4 relative z-10">
                <Field icon={MapPin} label="Village / Locality" value={app.village} />
                <Field icon={Building} label="Post Office" value={app.post_office} />
                <Field icon={Building} label="City / Town" value={app.city} />
                <Field icon={MapPin} label="State" value={app.state} />
                <Field icon={Hash} label="PIN Code" value={app.pin_code} />
              </div>
            </Card>
          </div>

          {/* Documents */}
          <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><FileImage className="h-5 w-5" /></div>
              Uploaded Documents
            </h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <DocCard label="Aadhaar Card" url={app.aadhaar_url} />
              <DocCard label="DOB Proof" url={app.dob_proof_url} />
              <DocCard label="Photograph" url={app.photo_url} />
              <DocCard label="Signature" url={app.signature_url} />
              <DocCard label="Payment Screenshot" url={app.payment_screenshot_url} />
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><MessageSquare className="h-5 w-5" /></div>
              Internal Admin Notes
            </h3>
            
            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {data.notes.length === 0 ? (
                <div className="py-8 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground/70">No internal notes yet.</p>
                </div>
              ) : (
                data.notes.map((n: any, idx: number) => (
                  <div key={n.id} className={cn(
                    "rounded-2xl p-4 shadow-sm border text-sm",
                    idx === 0 ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border/40"
                  )}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      {formatDateIST(n.created_at)}
                      {idx === 0 && <span className="ml-auto text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">LATEST</span>}
                    </div>
                    <div className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap">{n.note}</div>
                  </div>
                ))
              )}
            </div>
            
            <div className="bg-muted/20 p-2 rounded-2xl border border-border/40 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Textarea
                placeholder="Type a private note here (only visible to admins)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none"
              />
              <div className="flex justify-end p-2">
                <Button
                  size="sm"
                  className="rounded-xl shadow-md font-semibold px-6"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() => addNote.mutate()}
                >
                  {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Note"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <CreditCard className="w-32 h-32" />
            </div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><CreditCard className="h-5 w-5" /></div>
              Payment Status
            </h3>
            <div className="space-y-5 relative z-10">
              <div className={cn(
                "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
                app.payment_verified_at 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]" 
                  : "bg-amber-500/10 border-amber-500/30 text-amber-700 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]"
              )}>
                <div className="font-bold text-lg mb-1">
                  {app.payment_verified_at ? "Payment Verified" : "Verification Pending"}
                </div>
                {app.payment_verified_at && (
                  <div className="text-xs font-semibold opacity-80 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDateIST(app.payment_verified_at)}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 w-full">
                {!app.payment_verified_at ? (
                  <Button
                    size="lg"
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 font-bold"
                    onClick={() => verify.mutate(true)}
                    disabled={verify.isPending}
                  >
                    {verify.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5 mr-2" /> Mark as Verified</>}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    onClick={() => verify.mutate(false)}
                    disabled={verify.isPending}
                  >
                    {verify.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><XCircle className="h-5 w-5 mr-2" /> Revoke Verification</>}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8 rounded-3xl shadow-sm border-border/40 bg-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
              Activity Timeline
            </h3>
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-primary/20 pb-2">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-primary/20 shadow-sm" />
                <div>
                  <div className="font-bold text-sm uppercase tracking-wider text-foreground mb-1">
                    {app.application_status.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {formatDateIST(app.status_updated_at)}
                  </div>
                  {app.status_reason && (
                    <div className="text-[13px] bg-muted/40 p-3.5 rounded-xl border border-border/50 text-foreground/85 leading-relaxed shadow-sm">
                      <span className="font-bold text-[10px] uppercase tracking-widest block mb-1 opacity-60 text-primary">Status Reason</span>
                      {app.status_reason}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative pl-6 border-l-2 border-transparent">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-muted-foreground ring-4 ring-muted shadow-sm" />
                <div>
                  <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-1">Application Submitted</div>
                  <div className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {formatDateIST(app.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
