import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submissionSchema = z.object({
  agency_mobile: z.string().min(10).max(15),
  customer_mobile: z.string().min(10).max(15),
  email: z.string().email().max(255),
  full_name: z.string().min(2).max(120),
  father_name: z.string().min(2).max(120),
  mother_name: z.string().min(2).max(120),
  village: z.string().min(1).max(120),
  post_office: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  district: z.string().min(1).max(120),
  pin_code: z.string().min(4).max(10),
  aadhaar_path: z.string().min(1),
  dob_proof_path: z.string().nullable().optional(),
  photo_path: z.string().min(1),
  signature_path: z.string().min(1),
  payment_screenshot_path: z.string().min(1),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

    async function sign(path: string | null | undefined): Promise<string | null> {
      if (!path) return null;
      const { data: signed, error } = await supabaseAdmin.storage
        .from("pan-documents")
        .createSignedUrl(path, TEN_YEARS);
      if (error) throw new Error(`Failed to sign ${path}: ${error.message}`);
      return signed.signedUrl;
    }

    const [aadhaar_url, dob_proof_url, photo_url, signature_url, payment_screenshot_url] =
      await Promise.all([
        sign(data.aadhaar_path),
        sign(data.dob_proof_path ?? null),
        sign(data.photo_path),
        sign(data.signature_path),
        sign(data.payment_screenshot_path),
      ]);

    const randomHex = Math.random().toString(16).slice(2, 8).toUpperCase();
    const application_no = `PAN-${randomHex}`;

    const row = {
      agency_mobile: data.agency_mobile,
      customer_mobile: data.customer_mobile,
      email: data.email,
      full_name: data.full_name,
      father_name: data.father_name,
      mother_name: data.mother_name,
      village: data.village,
      post_office: data.post_office,
      city: data.city,
      district: data.district,
      pin_code: data.pin_code,
      aadhaar_url: aadhaar_url!,
      dob_proof_url,
      photo_url: photo_url!,
      signature_url: signature_url!,
      payment_screenshot_url: payment_screenshot_url!,
      submission_status: "pending" as const,
      application_no,
    };

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("pan_applications")
      .insert(row)
      .select("id, created_at")
      .single();
    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);

    // Optional: forward to Google Apps Script webhook for Sheets sync.
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    let sheetSynced = false;
    if (webhookUrl) {
      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: inserted.created_at,
            ...row,
          }),
        });
        sheetSynced = resp.ok;
        if (sheetSynced) {
          await supabaseAdmin
            .from("pan_applications")
            .update({ sheet_synced: true })
            .eq("id", inserted.id);
        }
      } catch (e) {
        console.error("Sheets webhook failed", e);
      }
    }

    return { id: inserted.id, application_no, sheet_synced: sheetSynced };
  });
