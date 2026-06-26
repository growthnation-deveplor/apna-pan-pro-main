import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pan_applications")
      .select(
        "id, full_name, customer_mobile, email, district, application_status, submission_status, payment_verified_at, dob_proof_url, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Extract the storage object path from a stored signed/public URL.
// Returns e.g. "<uuid>/aadhaar/<file>.pdf" for our pan-documents bucket.
function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = "/pan-documents/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export const adminGetApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: app, error } = await context.supabase
      .from("pan_applications")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Not found");
    const { data: notes } = await context.supabase
      .from("admin_notes")
      .select("id, note, created_at, author_id")
      .eq("application_id", data.id)
      .order("created_at", { ascending: false });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ONE_HOUR = 60 * 60;
    const fields = [
      "aadhaar_url",
      "dob_proof_url",
      "photo_url",
      "signature_url",
      "payment_screenshot_url",
    ] as const;

    await Promise.all(
      fields.map(async (field) => {
        const path = extractStoragePath((app as any)[field]);
        if (!path) return;
        const { data: signed } = await supabaseAdmin.storage
          .from("pan-documents")
          .createSignedUrl(path, ONE_HOUR);
        if (signed?.signedUrl) (app as any)[field] = signed.signedUrl;
      }),
    );

    return { app, notes: notes ?? [] };
  });

export const adminListApplicationDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pan_applications")
      .select(
        "id, full_name, customer_mobile, email, district, application_status, created_at, aadhaar_url, dob_proof_url, photo_url, signature_url, payment_screenshot_url",
      )
      .order("created_at", { ascending: false })
      .limit(100);
      
    if (error) throw new Error(error.message);
    
    const apps = data ?? [];
    
    // Sign URLs
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ONE_HOUR = 60 * 60;
    const fields = [
      "aadhaar_url",
      "dob_proof_url",
      "photo_url",
      "signature_url",
      "payment_screenshot_url",
    ] as const;

    await Promise.all(
      apps.map(async (app) => {
        await Promise.all(
          fields.map(async (field) => {
            const path = extractStoragePath((app as any)[field]);
            if (!path) return;
            const { data: signed } = await supabaseAdmin.storage
              .from("pan-documents")
              .createSignedUrl(path, ONE_HOUR);
            if (signed?.signedUrl) (app as any)[field] = signed.signedUrl;
          })
        );
      })
    );

    return apps;
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "pending",
          "under_verification",
          "need_more_documents",
          "payment_pending",
          "verified",
          "approved",
          "rejected",
          "completed",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("pan_applications")
      .update({
        application_status: data.status,
        status_updated_at: new Date().toISOString(),
        status_updated_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_logs").insert({
      actor_id: context.userId,
      action: "status_update",
      entity_type: "application",
      entity_id: data.id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const adminVerifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), verify: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("pan_applications")
      .update({
        payment_verified_at: data.verify ? new Date().toISOString() : null,
        payment_verified_by: data.verify ? context.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_logs").insert({
      actor_id: context.userId,
      action: data.verify ? "payment_verify" : "payment_unverify",
      entity_type: "application",
      entity_id: data.id,
    });
    return { ok: true };
  });

export const adminAddNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ application_id: z.string().uuid(), note: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("admin_notes").insert({
      application_id: data.application_id,
      note: data.note,
      author_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("pan_applications")
      .select("id, application_status, payment_verified_at, customer_mobile, created_at");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const todayCount = rows.filter((r: any) => r.created_at >= todayIso).length;
    const byStatus = (s: string) => rows.filter((r: any) => r.application_status === s).length;
    const customers = new Set(rows.map((r: any) => r.customer_mobile)).size;
    const paymentsVerified = rows.filter((r: any) => r.payment_verified_at).length;

    // 14-day trend
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const lo = d.toISOString();
      const hi = next.toISOString();
      days.push({
        date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        count: rows.filter((r: any) => r.created_at >= lo && r.created_at < hi).length,
      });
    }

    return {
      total: rows.length,
      today: todayCount,
      pending: byStatus("pending"),
      approved: byStatus("approved"),
      rejected: byStatus("rejected"),
      completed: byStatus("completed"),
      customers,
      paymentsVerified,
      paymentsPending: rows.length - paymentsVerified,
      trend: days,
    };
  });
