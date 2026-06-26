import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  FileImage,
  FileText,
  Loader2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/documents/$id")({
  component: DocDetail,
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
    <div className="border-b border-muted/50 pb-2 last:border-0 last:pb-0">
      <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 text-foreground break-words">{value || "—"}</div>
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

function DocViewer({ label, url }: { label: string; url: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Reset zoom & rotation when document changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] border border-dashed rounded-xl bg-muted/20 p-8 text-center">
        <FileText className="h-16 w-16 text-muted-foreground/40 mb-4 stroke-1" />
        <h4 className="font-semibold text-lg text-foreground">Not Uploaded</h4>
        <p className="text-sm text-muted-foreground max-w-xs mt-1">
          The applicant has not uploaded a file for {label} yet.
        </p>
      </div>
    );
  }

  const kind = getFileKind(url);

  return (
    <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Viewer toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          {kind === "pdf" ? (
            <FileText className="h-5 w-5 text-rose-500" />
          ) : (
            <FileImage className="h-5 w-5 text-blue-500" />
          )}
          <span className="font-semibold text-sm">{label} Document</span>
        </div>

        <div className="flex items-center gap-2">
          {kind === "image" && (
            <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono px-1 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-[1px] h-4 bg-muted mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                title="Reset View"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <a href={url} target="_blank" rel="noreferrer" className="inline-flex">
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Open Original
            </Button>
          </a>
          <a href={url} download className="inline-flex">
            <Button size="sm" className="h-8 gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </a>
        </div>
      </div>

      {/* Main viewer viewport */}
      <div className="flex-1 overflow-auto bg-muted/30 p-6 flex items-center justify-center min-h-[500px]">
        {kind === "image" ? (
          <div className="relative border shadow-md rounded bg-background overflow-hidden max-w-full max-h-[600px] flex items-center justify-center p-4">
            <img
              src={url}
              alt={label}
              className="max-w-full max-h-[550px] object-contain transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        ) : kind === "pdf" ? (
          <iframe
            src={url}
            title={label}
            className="w-full h-[600px] border-0 rounded bg-background shadow-sm"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground py-16">
            <FileImage className="h-16 w-16 stroke-1" />
            <p className="text-sm">Unable to render preview. Please download the file to view.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocDetail() {
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
  const [activeDocTab, setActiveDocTab] = useState("aadhaar");

  // Automatically switch tab to first uploaded document
  useEffect(() => {
    if (data?.app) {
      const app = data.app;
      if (app.aadhaar_url) setActiveDocTab("aadhaar");
      else if (app.dob_proof_url) setActiveDocTab("dob");
      else if (app.photo_url) setActiveDocTab("photo");
      else if (app.signature_url) setActiveDocTab("signature");
      else if (app.payment_screenshot_url) setActiveDocTab("payment");
    }
  }, [data]);

  const verify = useMutation({
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success("Payment status updated");
    },
    mutationFn: (verify: boolean) => verifyFn({ data: { id, verify } }),
    onError: (e: any) => toast.error(e.message),
  });

  const addNote = useMutation({
    onSuccess: () => {
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success("Admin note added successfully");
    },
    mutationFn: () => noteFn({ data: { application_id: id, note } }),
    onError: (e: any) => toast.error(e.message),
  });

  async function changeStatus(status: string) {
    setSavingStatus(true);
    try {
      await updateFn({ data: { id, status: status as any } });
      await qc.invalidateQueries({ queryKey: ["admin-app", id] });
      toast.success(`Status updated to ${status.replace(/_/g, " ")}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingStatus(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-medium">Loading application and documents…</span>
      </div>
    );
  }

  const app = data.app;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/documents"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Back to Document Center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {app.full_name}
              </h1>
              <Badge variant="outline" className="capitalize">
                {app.application_status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Submitted on {new Date(app.created_at).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status:
            </span>
            <Select value={app.application_status} onValueChange={changeStatus}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {savingStatus && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="w-[1px] h-6 bg-muted self-center" />

          {/* Payment Status Action */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                app.payment_verified_at
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs"
                  : "border-amber-500/40 text-amber-700 bg-amber-500/10 text-xs"
              }
            >
              {app.payment_verified_at ? "Payment Verified" : "Payment Pending"}
            </Badge>
            {!app.payment_verified_at ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
                onClick={() => verify.mutate(true)}
                disabled={verify.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Verify
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 text-xs border-rose-500/30 text-rose-700 hover:bg-rose-500/10 hover:text-rose-800"
                onClick={() => verify.mutate(false)}
                disabled={verify.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1 text-rose-600" /> Unverify
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Details & Notes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 1: Customer Details */}
          <Card className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Application Details
            </h3>
            <div className="space-y-3">
              <Field label="Applicant Name" value={app.full_name} />
              <Field label="Father's Name" value={app.father_name} />
              <Field label="Mother's Name" value={app.mother_name} />
              <Field
                label="Email"
                value={
                  app.email ? (
                    <a href={`mailto:${app.email}`} className="text-primary hover:underline flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {app.email}
                    </a>
                  ) : null
                }
              />
              <Field
                label="Mobile Phone"
                value={
                  app.customer_mobile ? (
                    <a href={`tel:${app.customer_mobile}`} className="text-primary hover:underline flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 shrink-0" /> {app.customer_mobile}
                    </a>
                  ) : null
                }
              />
              {app.agency_mobile && (
                <Field label="Agency Mobile" value={app.agency_mobile} />
              )}
            </div>
          </Card>

          {/* Section 2: Address */}
          <Card className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Address Details
            </h3>
            <div className="space-y-3">
              <Field label="Village" value={app.village} />
              <Field label="Post Office" value={app.post_office} />
              <Field label="City / Taluk" value={app.city} />
              <Field label="District" value={app.district} />
              <Field label="PIN Code" value={app.pin_code} />
            </div>
          </Card>

          {/* Section 3: Notes */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Admin Notes
            </h3>
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {data.notes.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-2">No notes posted yet.</p>
              )}
              {data.notes.map((n: any) => (
                <div key={n.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Admin Note</span>
                    <span>{new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{n.note}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-2">
              <Textarea
                placeholder="Type a note for review…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-8 text-xs px-3"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() => addNote.mutate()}
                >
                  {addNote.isPending ? "Adding…" : "Add Note"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Tabbed Documents View */}
        <div className="lg:col-span-2">
          <Tabs value={activeDocTab} onValueChange={setActiveDocTab} className="w-full space-y-3">
            <div className="bg-card border rounded-lg p-1.5 shadow-sm">
              <TabsList className="grid grid-cols-5 h-auto bg-transparent p-0 gap-1">
                <TabsTrigger
                  value="aadhaar"
                  className="py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${app.aadhaar_url ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  Aadhaar
                </TabsTrigger>
                <TabsTrigger
                  value="dob"
                  className="py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${app.dob_proof_url ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  DOB Proof
                </TabsTrigger>
                <TabsTrigger
                  value="photo"
                  className="py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${app.photo_url ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  Photo
                </TabsTrigger>
                <TabsTrigger
                  value="signature"
                  className="py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${app.signature_url ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  Signature
                </TabsTrigger>
                <TabsTrigger
                  value="payment"
                  className="py-2 text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${app.payment_screenshot_url ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                  Payment
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="aadhaar" className="mt-0 outline-none">
              <DocViewer label="Aadhaar" url={app.aadhaar_url} />
            </TabsContent>

            <TabsContent value="dob" className="mt-0 outline-none">
              <DocViewer label="DOB Proof" url={app.dob_proof_url} />
            </TabsContent>

            <TabsContent value="photo" className="mt-0 outline-none">
              <DocViewer label="Photograph" url={app.photo_url} />
            </TabsContent>

            <TabsContent value="signature" className="mt-0 outline-none">
              <DocViewer label="Signature" url={app.signature_url} />
            </TabsContent>

            <TabsContent value="payment" className="mt-0 outline-none">
              <DocViewer label="Payment Screenshot" url={app.payment_screenshot_url} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
