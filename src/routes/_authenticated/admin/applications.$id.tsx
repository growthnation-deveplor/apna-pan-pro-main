import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  adminGetApplication,
  adminUpdateStatus,
  adminVerifyPayment,
  adminAddNote,
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
} from "lucide-react";
import { toast } from "sonner";

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
];

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 break-words">{value || "—"}</div>
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
      <Card className="p-4 border-dashed">
        <div className="text-sm font-medium mb-2">{label}</div>
        <div className="aspect-[4/3] rounded-md border border-dashed bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
          Not uploaded
        </div>
      </Card>
    );
  }
  const kind = getFileKind(url);
  return (
    <Card className="p-3 space-y-2 group">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium flex items-center gap-1.5 min-w-0">
          {kind === "pdf" ? (
            <FileText className="h-4 w-4 shrink-0 text-rose-500" />
          ) : (
            <FileImage className="h-4 w-4 shrink-0 text-blue-500" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={url} target="_blank" rel="noreferrer" title="Open in new tab">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
          <a href={url} download title="Download">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button className="block w-full text-left">
            <div className="aspect-[4/3] rounded-md border bg-muted flex items-center justify-center overflow-hidden relative">
              {kind === "image" ? (
                <img src={url} alt={label} className="h-full w-full object-cover" />
              ) : kind === "pdf" ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-10 w-10 text-rose-500" />
                  <span className="text-xs font-medium">PDF document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="h-10 w-10" />
                  <span className="text-xs">Open file</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="inline-flex items-center gap-1 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </span>
              </div>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-base">{label}</DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                </Button>
              </a>
              <a href={url} download>
                <Button size="sm">
                  <Download className="h-3.5 w-3.5 mr-1" /> Download
                </Button>
              </a>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/40">
            {kind === "image" ? (
              <div className="min-h-full flex items-center justify-center p-4">
                <img src={url} alt={label} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <iframe
                src={url}
                title={label}
                className="w-full h-full border-0"
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-app", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

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
    if (status === "rejected" || status === "need_more_documents" || status === "hold") {
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

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const app = data.app;

  return (
    <div className="space-y-6">
      <Link
        to="/admin/applications"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to applications
      </Link>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{app.full_name}</h1>
          <p className="text-muted-foreground text-sm">
            App No: <span className="font-mono">{app.application_no || "—"}</span> • Submitted {new Date(app.created_at).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={app.application_status} onValueChange={changeStatus}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}

          <Dialog open={!!pendingStatus} onOpenChange={(o) => !o && setPendingStatus(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reason for {pendingStatus?.replace(/_/g, " ")}</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Enter the reason here..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setPendingStatus(null)}>Cancel</Button>
                <Button onClick={() => commitStatus(pendingStatus!, statusReason)} disabled={!statusReason.trim()}>
                  Update Status
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Customer Information</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" value={app.full_name} />
              <Field label="Father's name" value={app.father_name} />
              <Field label="Mother's name" value={app.mother_name} />
              <Field label="Email" value={app.email} />
              <Field label="Customer mobile" value={app.customer_mobile} />
              <Field label="Agency mobile" value={app.agency_mobile} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Address</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Village" value={app.village} />
              <Field label="Post Office" value={app.post_office} />
              <Field label="City" value={app.city} />
              <Field label="District" value={app.district} />
              <Field label="PIN" value={app.pin_code} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileImage className="h-4 w-4" /> Uploaded Documents
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <DocCard label="Aadhaar" url={app.aadhaar_url} />
              <DocCard label="DOB Proof" url={app.dob_proof_url} />
              <DocCard label="Photograph" url={app.photo_url} />
              <DocCard label="Signature" url={app.signature_url} />
              <DocCard label="Payment Screenshot" url={app.payment_screenshot_url} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Admin Notes</h3>
            <div className="space-y-3 mb-4">
              {data.notes.length === 0 && (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
              {data.notes.map((n: any) => (
                <div key={n.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(n.created_at).toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{n.note}</div>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Add a private admin note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                disabled={!note.trim() || addNote.isPending}
                onClick={() => addNote.mutate()}
              >
                Add note
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payment</h3>
            <div className="space-y-3">
              <Badge variant="outline" className={app.payment_verified_at ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" : "border-amber-500/40 text-amber-700 bg-amber-500/10"}>
                {app.payment_verified_at ? "Verified" : "Pending verification"}
              </Badge>
              {app.payment_verified_at && (
                <p className="text-xs text-muted-foreground">
                  Verified at {new Date(app.payment_verified_at).toLocaleString("en-IN")}
                </p>
              )}
              <div className="flex gap-2">
                {!app.payment_verified_at ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => verify.mutate(true)}
                    disabled={verify.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verify.mutate(false)}
                    disabled={verify.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Unverify
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Status Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-primary" />
                <div>
                  <div className="font-medium capitalize">{app.application_status.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(app.status_updated_at).toLocaleString("en-IN")}
                  </div>
                  {app.status_reason && (
                    <div className="mt-1.5 text-sm bg-muted p-2.5 rounded-md border text-foreground/85">
                      <span className="font-semibold text-xs block mb-0.5 opacity-70">Reason</span>
                      {app.status_reason}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 mt-1.5 rounded-full bg-muted-foreground" />
                <div>
                  <div className="font-medium">Submitted</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleString("en-IN")}
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
