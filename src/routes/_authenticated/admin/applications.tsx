import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { adminListApplications } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Search, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: ApplicationsPage,
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
};

function ApplicationsPage() {
  const fn = useServerFn(adminListApplications);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => fn(),
  });
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useMemo(() => {
    const list = data ?? [];
    let filtered = list;
    if (statusFilter !== "all") {
      filtered = filtered.filter((r: any) => r.application_status === statusFilter);
    }
    if (!q.trim()) return filtered;
    const s = q.toLowerCase();
    return filtered.filter(
      (r: any) =>
        r.full_name?.toLowerCase().includes(s) ||
        r.application_no?.toLowerCase().includes(s) ||
        r.customer_mobile?.includes(s) ||
        r.email?.toLowerCase().includes(s) ||
        r.district?.toLowerCase().includes(s),
    );
  }, [data, q, statusFilter]);

  function exportCsv() {
    const list = rows;
    const headers = ["App No", "Name", "Mobile", "Email", "District", "Status", "Payment", "Date"];
    const csv = [headers.join(",")]
      .concat(
        list.map((r: any) =>
          [
            r.application_no || r.id,
            r.full_name,
            r.customer_mobile,
            r.email,
            r.district,
            r.application_status,
            r.payment_verified_at ? "verified" : "pending",
            new Date(r.created_at).toISOString(),
          ]
            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Applications</h2>
          <p className="text-sm text-muted-foreground">{rows.length} records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search App No, name, mobile…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.keys(statusVariants).map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.application_no || "—"}</TableCell>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{r.customer_mobile}</TableCell>
                    <TableCell>{r.district}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusVariants[r.application_status] ?? ""}>
                        {r.application_status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.payment_verified_at ? (
                        <Badge variant="outline" className={statusVariants.verified}>
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={statusVariants.pending}>
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/admin/applications/$id"
                        params={{ id: r.id }}
                        className="text-primary text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  No applications found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
