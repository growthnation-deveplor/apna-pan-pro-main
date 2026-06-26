import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { adminListApplications } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const fn = useServerFn(adminListApplications);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => fn(),
  });

  const customers = useMemo(() => {
    const list = data ?? [];
    const map = new Map<string, any>();
    list.forEach((r: any) => {
      const key = r.customer_mobile;
      if (!map.has(key)) {
        map.set(key, {
          name: r.full_name,
          mobile: r.customer_mobile,
          email: r.email,
          district: r.district,
          count: 0,
          last: r.created_at,
          status: r.application_status,
        });
      }
      const c = map.get(key);
      c.count++;
      if (r.created_at > c.last) {
        c.last = r.created_at;
        c.status = r.application_status;
      }
    });
    return Array.from(map.values()).sort((a, b) => (b.last > a.last ? 1 : -1));
  }, [data]);

  return (
    <Card className="p-4 lg:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Customers</h2>
        <p className="text-sm text-muted-foreground">{customers.length} unique customers</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Last Status</TableHead>
              <TableHead>Last Application</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.mobile}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.mobile}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.district}</TableCell>
                  <TableCell>{c.count}</TableCell>
                  <TableCell className="capitalize">{c.status?.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(c.last).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
