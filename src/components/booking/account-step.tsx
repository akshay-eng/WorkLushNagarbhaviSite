"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useAuth, type User } from "@/components/auth/auth-context";
import { CtaButton } from "@/components/site/cta";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { site } from "@/data/site";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

export type AccountMode = "register" | "login";
type Errors = Record<string, string>;

/** Register, then sign in with what you just chose. Used inside checkout and
 *  on the account page. */
export function AccountForms({ mode, onMode, onSignedIn, context = "checkout" }: { mode: AccountMode; onMode: (m: AccountMode) => void; onSignedIn: (u: User) => void; context?: "checkout" | "account" }) {
  const [justRegistered, setJustRegistered] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-5">
      {context === "checkout" && <SubSteps mode={mode} />}
      <AnimatePresence mode="wait" initial={false}>
        {mode === "register" ? (
          <motion.div key="register" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: spring.slow.exit }} transition={spring.slow}>
            <RegisterForm
              onDone={(email) => {
                setJustRegistered(email);
                onMode("login");
              }}
            />
            <p className="type-small mt-4 text-center text-muted-foreground">
              Already have an account?{" "}
              <button type="button" onClick={() => onMode("login")} className="font-semibold text-teal underline-offset-4 hover:underline">
                Sign in
              </button>
            </p>
          </motion.div>
        ) : (
          <motion.div key="login" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12, transition: spring.slow.exit }} transition={spring.slow}>
            <AnimatePresence>
              {justRegistered && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: spring.fast.exit }}
                  transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
                  className="type-small mb-4 flex items-start gap-3 rounded-2xl bg-lime/40 px-4 py-3 text-ink"
                  role="status"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
                  <span>
                    <span className="font-semibold">Account created.</span> Now sign in with the password you just chose{context === "checkout" ? " to continue." : "."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <LoginForm defaultEmail={justRegistered ?? ""} onDone={onSignedIn} />
            <p className="type-small mt-4 text-center text-muted-foreground">
              New to Worklush?{" "}
              <button type="button" onClick={() => onMode("register")} className="font-semibold text-teal underline-offset-4 hover:underline">
                Create an account
              </button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The account page's version, with its own heading. */
export function AccountStep({ mode, onMode, onSignedIn }: { mode: AccountMode; onMode: (m: AccountMode) => void; onSignedIn: (u: User) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="type-eyebrow">Your account</p>
        <h1 className="type-h2 mt-1 text-ink">{mode === "register" ? "Create your account" : "Sign in to Worklush"}</h1>
      </div>
      <AccountForms mode={mode} onMode={onMode} onSignedIn={onSignedIn} context="account" />
    </div>
  );
}

function SubSteps({ mode }: { mode: AccountMode }) {
  const steps = ["Register", "Sign in", "Check out"];
  const at = mode === "register" ? 0 : 1;
  return (
    <ol className="flex items-center gap-2" aria-label="Account steps">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 items-center gap-2">
          <span
            className={cn("type-caption grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-200", i < at ? "bg-teal text-white" : i === at ? "bg-ink text-lime" : "bg-mint text-muted-foreground")}
            aria-current={i === at ? "step" : undefined}
          >
            {i < at ? "✓" : i + 1}
          </span>
          <span className={cn("type-small", i === at ? "font-semibold text-ink" : "text-muted-foreground")}>{s}</span>
          {i < steps.length - 1 && (
            <span className="relative h-px flex-1 overflow-hidden bg-border">
              <motion.span className="absolute inset-0 origin-left bg-teal" initial={false} animate={{ scaleX: i < at ? 1 : 0 }} transition={spring.slow} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || /[A-Z]/.test(pw)) s++;
  return s;
}

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-invalid={invalid || undefined} className="h-11 pr-11" required />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-hover hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function shake(el: HTMLElement | null) {
  el?.animate(
    [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "translateX(0)" }],
    { duration: 340, easing: "ease-in-out" }
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="type-small rounded-xl bg-[#fdeee6] px-3 py-2 text-[#8a3a12]" role="alert">
      {children}
    </p>
  );
}

function RegisterForm({ onDone }: { onDone: (email: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const score = strength(form.password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setErrors({ agree: "Please accept the terms to continue." });
      shake(ref.current);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { form: "Something went wrong. Try again." });
        shake(ref.current);
        return;
      }
      onDone(data.email);
    } catch {
      setErrors({ form: "You seem to be offline. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={ref} onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="reg-name">Full name</FieldLabel>
          <Input id="reg-name" value={form.name} onChange={(e) => set("name")(e.target.value)} autoComplete="name" className="h-11" aria-invalid={!!errors.name || undefined} required />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.phone || undefined}>
          <FieldLabel htmlFor="reg-phone">Mobile number</FieldLabel>
          <div className="flex">
            <span className="type-small inline-flex h-11 items-center rounded-l-[10px] border border-r-0 border-input bg-muted px-3 text-muted-foreground">+91</span>
            <Input
              id="reg-phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
              autoComplete="tel-national"
              className="h-11 rounded-l-none"
              aria-invalid={!!errors.phone || undefined}
              required
            />
          </div>
          {errors.phone && <FieldError>{errors.phone}</FieldError>}
        </Field>
      </div>
      <Field data-invalid={!!errors.email || undefined}>
        <FieldLabel htmlFor="reg-email">Email</FieldLabel>
        <Input id="reg-email" type="email" inputMode="email" value={form.email} onChange={(e) => set("email")(e.target.value)} autoComplete="email" className="h-11" aria-invalid={!!errors.email || undefined} required />
        {errors.email ? <FieldError>{errors.email}</FieldError> : <FieldDescription>Your confirmation and receipt go here.</FieldDescription>}
      </Field>
      <Field data-invalid={!!errors.password || undefined}>
        <FieldLabel htmlFor="reg-password">Password</FieldLabel>
        <PasswordInput id="reg-password" value={form.password} onChange={set("password")} invalid={!!errors.password} autoComplete="new-password" />
        <div className="flex gap-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <motion.span className={cn("block h-full origin-left", score >= 3 ? "bg-teal" : score === 2 ? "bg-lime-strong" : "bg-ember")} initial={false} animate={{ scaleX: i < score ? 1 : 0 }} transition={spring.moderate} />
            </span>
          ))}
        </div>
        {errors.password ? <FieldError>{errors.password}</FieldError> : <FieldDescription>At least 8 characters, with a letter and a number.</FieldDescription>}
      </Field>
      <label className="type-small flex cursor-pointer items-start gap-3 text-foreground">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => {
            setAgree(e.target.checked);
            if (errors.agree) setErrors((x) => ({ ...x, agree: "" }));
          }}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#037e6e]"
        />
        <span>
          I agree to the{" "}
          <a href={site.legal.terms} target="_blank" rel="noreferrer" className="font-semibold text-teal underline underline-offset-2">
            terms
          </a>{" "}
          and{" "}
          <a href={site.legal.privacy} target="_blank" rel="noreferrer" className="font-semibold text-teal underline underline-offset-2">
            privacy policy
          </a>
          .
        </span>
      </label>
      {errors.agree && <p className="type-small -mt-2 text-destructive">{errors.agree}</p>}
      {errors.form && <FormError>{errors.form}</FormError>}
      <CtaButton type="submit" variant="ink" arrow loading={busy} className="w-full sm:w-fit">
        Create account
      </CtaButton>
    </form>
  );
}

function LoginForm({ defaultEmail, onDone }: { defaultEmail: string; onDone: (user: User) => void }) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { form: "Something went wrong. Try again." });
        shake(ref.current);
        return;
      }
      setUser(data.user);
      onDone(data.user);
    } catch {
      setErrors({ form: "You seem to be offline. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form ref={ref} onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="login-email">Email</FieldLabel>
          <Input id="login-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11" aria-invalid={!!errors.email || undefined} required />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="login-password">Password</FieldLabel>
          <PasswordInput id="login-password" value={password} onChange={setPassword} invalid={!!errors.password} autoComplete="current-password" />
          {errors.password && <FieldError>{errors.password}</FieldError>}
        </Field>
      </div>
      {errors.form && <FormError>{errors.form}</FormError>}
      <CtaButton type="submit" variant="ink" arrow loading={busy} className="w-full sm:w-fit">
        Sign in and continue
      </CtaButton>
    </form>
  );
}
