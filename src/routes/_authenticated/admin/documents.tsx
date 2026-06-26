import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListApplicationDocuments } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileImage,
  FileText,
  ExternalLink,
  Download,
  Eye,
  User,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/documents")({
  component: DocsPage,
});

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
      <div className="p-3 border rounded-lg border-dashed bg-muted/20">
        <div className="text-xs font-medium mb-2">{label}</div>
        <div className="aspect-[4/3] rounded border border-dashed bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
          Not uploaded
        </div>
      </div>
    );
  }
  const kind = getFileKind(url);
  return (
    <div className="p-3 border rounded-lg space-y-2 group bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium flex items-center gap-1.5 min-w-0">
          {kind === "pdf" ? (
            <FileText className="h-3.5 w-3.5 shrink-0 text-rose-500" />
          ) : (
            <FileImage className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href={url} target="_blank" rel="noreferrer" title="Open in new tab">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
          <a href={url} download title="Download">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Download className="h-3 w-3" />
            </Button>
          </a>
        </div>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button className="block w-full text-left">
            <div className="aspect-[4/3] rounded border bg-muted flex items-center justify-center overflow-hidden relative">
              {kind === "image" ? (
                <img src={url} alt={label} className="h-full w-full object-cover" />
              ) : kind === "pdf" ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8 text-rose-500" />
                  <span className="text-[10px] font-medium">PDF document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="h-8 w-8" />
                  <span className="text-[10px]">Open file</span>
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
    </div>
  );
}

function DocsPage() {
  const fn = useServerFn(adminListApplicationDocuments);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-application-documents"],
    queryFn: () => fn(),
  });
  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Document Center</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Browse and verify documents uploaded with each application without leaving this page.
        </p>
      </div>
      
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse">
          Loading documents...
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((r: any) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="bg-muted/30 px-5 py-4 border-b flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> {r.full_name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {r.customer_mobile}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.district}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                    {r.application_status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <DocCard label="Aadhaar" url={r.aadhaar_url} />
                  <DocCard label="DOB Proof" url={r.dob_proof_url} />
                  <DocCard label="Photograph" url={r.photo_url} />
                  <DocCard label="Signature" url={r.signature_url} />
                  <DocCard label="Payment" url={r.payment_screenshot_url} />
                </div>
              </div>
            </Card>
          ))}
          {rows.length === 0 && (
            <div className="text-muted-foreground text-center py-12 border rounded-lg bg-muted/10">
              No applications or documents found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
