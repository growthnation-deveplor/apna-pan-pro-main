import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const trackApplication = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ application_no: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app, error } = await supabaseAdmin
      .from("pan_applications")
      .select("id, application_no, full_name, application_status, status_reason, status_updated_at, created_at, payment_verified_at")
      .eq("application_no", data.application_no.trim().toUpperCase())
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!app) return null;
    return app;
  });
