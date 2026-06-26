import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, createContext, useContext, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ShieldCheck, Zap, BadgeCheck, Globe, MessageCircle, ArrowRight,
  AlertTriangle, ScrollText, FileText, Upload, CheckCircle2,
  Mail, Phone, MapPin, IndianRupee, QrCode, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitApplication } from "@/lib/submit-application.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apna PAN Agency - New PAN Card & PAN Correction Apply Online" },
      {
        name: "description",
        content:
          "Apply online for New PAN Card and PAN Correction. Secure document upload, online verification and WhatsApp support.",
      },
      { property: "og:title", content: "Apna PAN Agency - Apply for PAN Online" },
      {
        property: "og:description",
        content:
          "Fast, secure & paperless PAN application. UTI/NSDL supported with WhatsApp help.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

const WHATSAPP_URL = "https://wa.me/918018923277";
const SUPPORT_EMAIL = "contactgrowthnation@gmail.com";
const SUPPORT_PHONE = "+91 8018923277";
const PAYMENT_QR_IMAGE = "https://lh7-rt.googleusercontent.com/formsz/AN7BsVAfsHw86vNhlMgD0vz99Pn-IrNsrwCa9iAB6b1j5VybZ5QNoW-Lyo1KjKY0OtaHa1pmsOKGRr6Kw745vLmGc7SobUQE_FRjWMdMzaCi4xdT1YNrg-gVzAI_01zIfP8uG5rMoKFeqvVrTk5WJ95KlFu4_DRXY6yPO9PJ-XwD5dhlcM5ARRd3ms_mLQPe4a-jZSqr68hLFx0lUerkS8NbMYA=w339?key=BlLx_XPd1UAour9X2CCc8w";

const formSchema = z.object({
  agency_mobile: z.string().trim().regex(/^\d{10,15}$/, "Enter a valid mobile number"),
  customer_mobile: z.string().trim().regex(/^\d{10,15}$/, "Enter a valid mobile number"),
  email: z.string().trim().email("Enter a valid email"),
  full_name: z.string().trim().min(2, "Required").max(120),
  father_name: z.string().trim().min(2, "Required").max(120),
  mother_name: z.string().trim().min(2, "Required").max(120),
  village: z.string().trim().min(1, "Required").max(120),
  post_office: z.string().trim().min(1, "Required").max(120),
  city: z.string().trim().min(1, "Required").max(120),
  district: z.string().trim().min(1, "Required").max(120),
  pin_code: z.string().trim().regex(/^\d{4,10}$/, "Enter a valid pin code"),
});

type FormFields = z.infer<typeof formSchema>;

const emptyForm: FormFields = {
  agency_mobile: "", customer_mobile: "", email: "", full_name: "",
  father_name: "", mother_name: "", village: "", post_office: "",
  city: "", district: "", pin_code: "",
};

const MAX_PDF = 5 * 1024 * 1024;
const MAX_IMG = 4 * 1024 * 1024;

type FilesState = {
  aadhaar: File | null;
  dob_proof: File | null;
  photo: File | null;
  signature: File | null;
  payment_screenshot: File | null;
};

const emptyFiles: FilesState = {
  aadhaar: null,
  dob_proof: null,
  photo: null,
  signature: null,
  payment_screenshot: null,
};

type ApplicationCtx = {
  form: FormFields;
  setForm: React.Dispatch<React.SetStateAction<FormFields>>;
  errors: Partial<Record<keyof FormFields, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof FormFields, string>>>>;
  files: FilesState;
  setFiles: React.Dispatch<React.SetStateAction<FilesState>>;
  submitting: boolean;
  success: string | null;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

const ApplicationContext = createContext<ApplicationCtx | null>(null);

function useApplicationContext() {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useApplicationContext must be used within ApplicationProvider");
  return ctx;
}

function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [files, setFiles] = useState<FilesState>(emptyFiles);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const submitFn = useServerFn(submitApplication);

  const uploadFile = useCallback(async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${folder}/${crypto.randomUUID()}.${ext.toLowerCase()}`;
    const { error } = await supabase.storage.from("pan-documents").upload(safeName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return safeName;
  }, []);

  const validateFile = useCallback((file: File | null, kind: "pdf" | "image", required: boolean, label: string): string | null => {
    if (!file) return required ? `${label} is required` : null;
    const maxSize = kind === "pdf" ? MAX_PDF : MAX_IMG;
    if (file.size > maxSize) return `${label} must be under ${Math.round(maxSize / 1024 / 1024)}MB`;
    if (kind === "pdf" && file.type !== "application/pdf") return `${label} must be a PDF`;
    if (kind === "image" && !file.type.startsWith("image/")) return `${label} must be an image`;
    return null;
  }, []);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormFields, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof FormFields;
        if (!fe[k]) fe[k] = i.message;
      });
      setErrors(fe);
      toast.error("Please fix the highlighted fields");
      return;
    }

    const fileErr =
      validateFile(files.aadhaar, "pdf", true, "Aadhaar PDF") ||
      validateFile(files.dob_proof, "pdf", false, "DOB Proof") ||
      validateFile(files.photo, "image", true, "Photograph") ||
      validateFile(files.signature, "image", true, "Signature") ||
      validateFile(files.payment_screenshot, "image", true, "Payment screenshot");
    if (fileErr) {
      toast.error(fileErr);
      return;
    }

    setSubmitting(true);
    try {
      const submissionId = crypto.randomUUID();
      const [aadhaar_path, photo_path, signature_path, payment_screenshot_path, dob_proof_path] =
        await Promise.all([
          uploadFile(files.aadhaar!, `${submissionId}/aadhaar`),
          uploadFile(files.photo!, `${submissionId}/photo`),
          uploadFile(files.signature!, `${submissionId}/signature`),
          uploadFile(files.payment_screenshot!, `${submissionId}/payment`),
          files.dob_proof ? uploadFile(files.dob_proof, `${submissionId}/dob`) : Promise.resolve(null),
        ]);

      const res = await submitFn({
        data: {
          ...parsed.data,
          aadhaar_path,
          dob_proof_path,
          photo_path,
          signature_path,
          payment_screenshot_path,
        },
      });

      setSuccess(res.id);
      setForm(emptyForm);
      setFiles(emptyFiles);
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [form, files, submitting, submitFn, uploadFile, validateFile]);

  return (
    <ApplicationContext.Provider
      value={{
        form,
        setForm,
        errors,
        setErrors,
        files,
        setFiles,
        submitting,
        success,
        setSuccess,
        onSubmit,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}


function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <Header />
      <Hero />
      <TrustBar />
      <InstructionsSection />
      <TermsSection />
      <PricingSection />
      <ApplicationProvider>
        <ApplicationForm />
        <PaymentSection />
      </ApplicationProvider>
      <WhatsAppSection />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-hero)] text-brand-foreground shadow-[var(--shadow-soft)]">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight">Apna PAN Agency</div>
            <div className="text-[11px] text-muted-foreground">UTI / NSDL Supported</div>
          </div>
        </a>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#instructions" className="hover:text-foreground">Instructions</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#apply" className="hover:text-foreground">Apply</a>
          <a href="#support" className="hover:text-foreground">Support</a>
        </nav>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </Button>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(1 0 0 / 0.18), transparent 40%), radial-gradient(circle at 80% 0%, oklch(0.62 0.17 145 / 0.35), transparent 50%)",
        }}
      />
      <div className="container relative mx-auto px-4 py-20 md:py-28 text-brand-foreground">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
            <span className="grid h-1.5 w-1.5 place-items-center rounded-full bg-success" />
            Trusted by thousands of applicants
          </div>
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Apply for New PAN Card & PAN Correction Online
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-white/80 md:text-lg">
            Fast, secure & paperless PAN application process — handled end‑to‑end by Apna PAN Agency.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#apply">
              <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90 shadow-[var(--shadow-glow)]">
                Apply Now <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <Button size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp Support
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: ShieldCheck, label: "Secure Process" },
    { icon: Globe, label: "Online Verification" },
    { icon: Zap, label: "Fast Processing" },
    { icon: BadgeCheck, label: "UTI / NSDL Supported" },
  ];
  return (
    <div className="border-y border-border bg-card">
      <div className="container mx-auto grid grid-cols-2 gap-px overflow-hidden px-4 py-4 md:grid-cols-4">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-center gap-2 py-3 text-sm font-medium">
            <Icon className="h-5 w-5 text-success" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InstructionsSection() {
  const items = [
    "Upload only clear and readable documents.",
    "Incorrect details or unclear documents may lead to rejection.",
    "Processing time depends on UTI/NSDL verification.",
    "Verification starts after form submission.",
    "Please verify all details before submitting.",
    "Our team only submits applications. Final approval depends on UTI/NSDL.",
  ];
  return (
    <section id="instructions" className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-2xl border-2 border-warning/40 bg-warning/10 p-6 md:p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-warning text-warning-foreground">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold">Important Instructions</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning-foreground/70" />
              <span className="text-foreground/80">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TermsSection() {
  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="mx-auto max-w-4xl rounded-2xl border border-info/30 bg-info/5 p-6 md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-info text-info-foreground">
            <ScrollText className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold">Terms & Conditions</h2>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
          <p>
            If the customer's Aadhaar already has a PAN issued or an existing PAN is found during
            verification, the application will still be processed and verified.
          </p>
          <p>In such cases, a full refund will not be applicable.</p>
          <p className="rounded-lg bg-card p-3 font-medium">
            ₹30 per application will be deducted as service / verification charges and the
            remaining amount will be refunded.
          </p>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const plans = [
    {
      title: "DOB Proof Uploaded",
      price: 139,
      icon: CheckCircle2,
      tone: "success" as const,
      tag: "Recommended",
      desc: "Includes Aadhaar + valid DOB proof document.",
    },
    {
      title: "DOB Proof Not Available",
      price: 199,
      icon: AlertTriangle,
      tone: "warning" as const,
      tag: "Higher charge",
      desc: "Used when no DOB proof can be uploaded with the application.",
    },
  ];
  return (
    <section id="pricing" className="container mx-auto px-4 pb-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Pricing</h2>
        <p className="mt-2 text-muted-foreground">Transparent, one-time application charge.</p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {plans.map(({ title, price, icon: Icon, tone, tag, desc }) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elegant)]"
          >
            <div className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${tone === "success" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
              {tag}
            </div>
            <div className={`mb-4 inline-grid h-11 w-11 place-items-center rounded-xl ${tone === "success" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <IndianRupee className="h-6 w-6 text-foreground" />
              <span className="text-4xl font-bold">{price}</span>
              <span className="ml-1 text-sm text-muted-foreground">/ application</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


function ApplicationForm() {
  const { form, setForm, errors, setErrors, files, setFiles, success, setSuccess, onSubmit } = useApplicationContext();

  const change = (k: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  if (success) return <SuccessCard id={success} onReset={() => setSuccess(null)} />;

  return (
    <section id="apply" className="container mx-auto px-4 pb-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">PAN Application Form</h2>
        <p className="mt-2 text-muted-foreground">
          Fill in your details exactly as per Aadhaar and upload required documents.
        </p>
      </div>

      <form id="apply-form" onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-6">
        <Card title="Applicant Details" icon={FileText}>
          <Grid>
            <Field label="Apna PAN Agency Registered Mobile Number" required error={errors.agency_mobile}>
              <Input inputMode="numeric" value={form.agency_mobile} onChange={change("agency_mobile")} placeholder="10-digit mobile" />
            </Field>
            <Field label="Customer Mobile Number" required error={errors.customer_mobile}>
              <Input inputMode="numeric" value={form.customer_mobile} onChange={change("customer_mobile")} placeholder="10-digit mobile" />
            </Field>
            <Field label="Email ID" required error={errors.email}>
              <Input type="email" value={form.email} onChange={change("email")} placeholder="name@example.com" />
            </Field>
            <Field label="Full Name (As per Aadhaar)" required error={errors.full_name}>
              <Input value={form.full_name} onChange={change("full_name")} />
            </Field>
            <Field label="Father Name" required error={errors.father_name}>
              <Input value={form.father_name} onChange={change("father_name")} />
            </Field>
            <Field label="Mother Name" required error={errors.mother_name}>
              <Input value={form.mother_name} onChange={change("mother_name")} />
            </Field>
            <Field label="Village" required error={errors.village}>
              <Input value={form.village} onChange={change("village")} />
            </Field>
            <Field label="Post Office" required error={errors.post_office}>
              <Input value={form.post_office} onChange={change("post_office")} />
            </Field>
            <Field label="City" required error={errors.city}>
              <Input value={form.city} onChange={change("city")} />
            </Field>
            <Field label="District" required error={errors.district}>
              <Input value={form.district} onChange={change("district")} />
            </Field>
            <Field label="Pin Code" required error={errors.pin_code}>
              <Input inputMode="numeric" value={form.pin_code} onChange={change("pin_code")} />
            </Field>
          </Grid>
        </Card>

        <Card title="Document Upload" icon={Upload}>
          <Grid>
            <FileField
              label="Aadhaar Card Front & Back"
              required
              accept="application/pdf"
              hint="PDF only · max 5MB"
              file={files.aadhaar}
              onChange={(f) => setFiles((s) => ({ ...s, aadhaar: f }))}
            />
            <FileField
              label="DOB Proof Document (optional)"
              accept="application/pdf"
              hint="PDF only · max 5MB"
              file={files.dob_proof}
              onChange={(f) => setFiles((s) => ({ ...s, dob_proof: f }))}
            />
            <div className="sm:col-span-2">
              <FileField
                label="Passport Size Photograph"
                required
                accept="image/*"
                hint="JPG / PNG · max 4MB"
                file={files.photo}
                onChange={(f) => setFiles((s) => ({ ...s, photo: f }))}
                large
              />
            </div>
            <FileField
              label="Full Signature"
              required
              accept="image/*"
              hint="JPG / PNG · max 4MB"
              file={files.signature}
              onChange={(f) => setFiles((s) => ({ ...s, signature: f }))}
            />
          </Grid>
        </Card>
      </form>
    </section>
  );
}


function SuccessCard({ id, onReset }: { id: string; onReset: () => void }) {
  const short = useMemo(() => id.slice(0, 8).toUpperCase(), [id]);
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-elegant)]">
        <div className="bg-success p-8 text-center text-success-foreground">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/15 backdrop-blur">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Application Submitted Successfully</h2>
          <p className="mt-2 text-sm text-white/85">
            Your documents have been received and are under verification.
          </p>
        </div>
        <div className="space-y-4 p-6 text-center">
          <div className="rounded-lg bg-muted p-3 text-sm">
            Reference ID: <span className="font-mono font-semibold">{short}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            For any help, reach our WhatsApp support team.
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <Button className="bg-success text-success-foreground hover:bg-success/90">
                <MessageCircle className="mr-1.5 h-4 w-4" /> Chat on WhatsApp
              </Button>
            </a>
            <Button variant="outline" onClick={onReset}>Submit another</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PaymentSection() {
  const { files, setFiles, submitting, success, onSubmit } = useApplicationContext();

  if (success) return null;

  return (
    <section id="payment" className="container mx-auto px-4 pb-16">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="p-8 text-brand-foreground" style={{ background: "var(--gradient-hero)" }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
              <QrCode className="h-3.5 w-3.5" /> Secure UPI
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Make Payment</h2>
            <p className="mt-2 text-white/80">
              Scan the QR with any UPI app (GPay, PhonePe, Paytm) and pay the exact amount for your category.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs text-white/70">With DOB Proof</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <IndianRupee className="h-5 w-5" />
                  <span className="text-2xl font-bold">139</span>
                </div>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <div className="text-xs text-white/70">Without DOB Proof</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <IndianRupee className="h-5 w-5" />
                  <span className="text-2xl font-bold">199</span>
                </div>
              </div>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><span className="text-success">●</span> Pay the exact amount for your category.</li>
              <li className="flex gap-2"><span className="text-success">●</span> Take a screenshot of the payment success page.</li>
              <li className="flex gap-2"><span className="text-success">●</span> Upload the screenshot below, then submit the application.</li>
            </ul>
          </div>
          <div className="flex flex-col items-center justify-center gap-5 p-8">
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted p-4">
              <img
                src={PAYMENT_QR_IMAGE}
                alt="UPI payment QR code for Apna PAN Agency"
                className="h-[420px] w-[380px] rounded-md bg-white object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                  const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (sib) sib.style.display = "flex";
                }}
              />
              <div className="hidden h-[420px] w-[380px] flex-col items-center justify-center rounded-md bg-white text-center text-xs text-muted-foreground">
                <QrCode className="mb-2 h-16 w-16 opacity-40" />
                QR code not available
              </div>
            </div>
            <div className="w-full max-w-sm">
              <FileField
                label="Payment Screenshot"
                required
                accept="image/*"
                hint="JPG / PNG · max 4MB"
                file={files.payment_screenshot}
                onChange={(f) => setFiles((s) => ({ ...s, payment_screenshot: f }))}
                large
              />
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                disabled={submitting}
                onClick={onSubmit}
                className="min-w-64 bg-success text-success-foreground hover:bg-success/90 shadow-[var(--shadow-glow)]"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit Application <ArrowRight className="ml-1.5 h-4 w-4" /></>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                By submitting you agree to the Terms & Conditions above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function WhatsAppSection() {
  return (
    <section id="support" className="container mx-auto px-4 pb-20">
      <div
        className="mx-auto max-w-4xl overflow-hidden rounded-3xl p-8 text-center text-success-foreground shadow-[var(--shadow-elegant)] md:p-12"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.52 0.17 145) 0%, oklch(0.62 0.17 145) 60%, oklch(0.72 0.16 155) 100%)",
        }}
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-bold md:text-4xl">Need Help?</h2>
        <p className="mt-2 text-white/90">Our support team is just one tap away.</p>
        <div className="mt-4 text-lg font-semibold">WhatsApp: {SUPPORT_PHONE}</div>
        <div className="mt-6">
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            <Button size="lg" className="bg-white text-success hover:bg-white/90">
              <MessageCircle className="mr-1.5 h-4 w-4" /> Chat on WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto grid gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-hero)] text-brand-foreground">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="font-semibold">Apna PAN Agency</div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            New PAN Card & PAN Correction — fully online, with WhatsApp support.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold">Contact</div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {SUPPORT_PHONE}</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a className="hover:text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> India</li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-2 font-semibold">Quick links</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#instructions" className="hover:text-foreground">Instructions</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Pricing</a></li>
            <li><a href="#apply" className="hover:text-foreground">Apply Now</a></li>
            <li><a href="#payment" className="hover:text-foreground">Payment</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Apna PAN Agency. All rights reserved.
      </div>
    </footer>
  );
}

/* ---------- small UI primitives ---------- */

function Card({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label, required, error, children,
}: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function FileField({
  label, required, accept, hint, file, onChange, large,
}: {
  label: string; required?: boolean; accept: string; hint: string;
  file: File | null; onChange: (f: File | null) => void; large?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <label
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 px-4 text-center transition hover:border-success/60 hover:bg-success/5",
          large ? "py-10" : "py-5",
        )}
      >
        <Upload className={cn("text-muted-foreground group-hover:text-success", large ? "h-8 w-8" : "h-5 w-5")} />
        <span className="text-sm font-medium">
          {file ? file.name : "Click to upload"}
        </span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

