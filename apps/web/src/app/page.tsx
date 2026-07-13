import Link from "next/link";
import { getDict } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";

// Home route for a signed-in account's role.
function homeFor(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "manufacturer") return "/catalog";
  if (role === "distributor") return "/logistics";
  return "/orders";
}

/* ------------------------------------------------------------------ */
/* Flip these to real store URLs once the native app ships.            */
const MOBILE_APP = {
  ios: null as string | null, // e.g. "https://apps.apple.com/app/idXXXXXXXXX"
  android: null as string | null, // e.g. "https://play.google.com/store/apps/details?id=..."
};
const mobileReady = Boolean(MOBILE_APP.ios || MOBILE_APP.android);

/* ------------------------------- icons ---------------------------- */
const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function BagIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function TruckIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function SplitIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg {...iconProps} width={20} height={20} aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}
function Check() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-verified"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ------------------------------ helpers --------------------------- */
function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-margin">
      <Check />
      <span>{children}</span>
    </li>
  );
}

function StoreBadge({
  store,
  downloadOn,
  comingTo,
}: {
  store: "ios" | "android";
  downloadOn: string;
  comingTo: string;
}) {
  const label = store === "ios" ? "App Store" : "Google Play";
  const href = MOBILE_APP[store];
  const inner = (
    <span className="flex items-center gap-2">
      <PhoneIcon />
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide opacity-70">
          {mobileReady ? downloadOn : comingTo}
        </span>
        <span className="block text-sm font-medium">{label}</span>
      </span>
    </span>
  );
  const base = "rounded-lg border px-4 py-2.5 transition flex items-center";
  return href ? (
    <a
      href={href}
      className={`${base} border-ink bg-ink text-paper hover:opacity-90`}
    >
      {inner}
    </a>
  ) : (
    <span
      className={`${base} cursor-not-allowed border-border bg-white text-margin opacity-70`}
      title="Coming soon"
      aria-disabled="true"
    >
      {inner}
    </span>
  );
}

/* -------------------------------- page ---------------------------- */
export default async function Home() {
  const d = await getDict();
  const t = d.home;

  // If already signed in, point the CTAs at the dashboard/account instead of
  // sign-up / sign-in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let dashboardHref: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("accounts")
      .select("role")
      .eq("id", user.id)
      .single();
    dashboardHref = homeFor(me?.role);
  }

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center sm:pt-24">
        <span className="inline-block rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-margin">
          {t.badge}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-medium tracking-tight sm:text-5xl">
          {t.heroTitle}
          <span className="text-signal">.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-margin">
          {t.heroLead}{" "}
          <span className="text-ink">{t.heroLeadStrong}</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {dashboardHref ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-md bg-signal px-6 py-3 text-sm font-medium text-white transition hover:bg-signal/90"
              >
                {t.goToDashboard}
              </Link>
              <Link
                href="/account"
                className="rounded-md border border-border bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-parchment"
              >
                {d.common.account}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="rounded-md bg-signal px-6 py-3 text-sm font-medium text-white transition hover:bg-signal/90"
              >
                {t.signUpFree}
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-border bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-parchment"
              >
                {d.common.signIn}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Money-flow infographic — the core value */}
      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-sm font-medium uppercase tracking-wide text-margin">
            {t.moneyTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-margin">
            {t.moneyLead}
          </p>

          {/* supply chain row */}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <FlowChip color="ink" label={t.flowManufacturer} sub={t.flowManufacturerSub} />
            <Arrow label={t.arrowCatalog} />
            <FlowChip color="signal" label={t.flowHalinest} sub={t.flowHalinestSub} />
            <Arrow label={t.arrowSell} />
            <FlowChip color="ink" label={t.flowWarung} sub={t.flowWarungSub} />
          </div>

          {/* settlement split */}
          <p className="mt-10 text-center text-xs uppercase tracking-wide text-margin">
            {t.splitIntro}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SplitCard color="ink" who={t.splitManufacturerWho} what={t.splitManufacturerWhat} />
            <SplitCard color="signal" who={t.splitHalinestWho} what={t.splitHalinestWhat} />
            <SplitCard color="verified" who={t.splitDistributorWho} what={t.splitDistributorWhat} />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-medium tracking-tight">
          {t.rolesTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-margin">
          {t.rolesLead}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <RoleCard
            icon={<BagIcon />}
            title={t.warungTitle}
            tagline={t.warungTagline}
            benefits={t.warungBenefits}
          />
          <RoleCard
            icon={<BoxIcon />}
            title={t.manufacturerTitle}
            tagline={t.manufacturerTagline}
            benefits={t.manufacturerBenefits}
          />
          <RoleCard
            icon={<TruckIcon />}
            title={t.distributorTitle}
            tagline={t.distributorTagline}
            benefits={t.distributorBenefits}
          />
        </div>
      </section>

      {/* Why Manifest */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-medium tracking-tight">
            {t.whyTitle}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Why icon={<SplitIcon />} title={t.why1Title} text={t.why1Text} />
            <Why icon={<ShieldIcon />} title={t.why2Title} text={t.why2Text} />
            <Why icon={<ChartIcon />} title={t.why3Title} text={t.why3Text} />
            <Why icon={<BoxIcon />} title={t.why4Title} text={t.why4Text} />
          </div>
        </div>
      </section>

      {/* Install / mobile */}
      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-2xl font-medium tracking-tight">
          {mobileReady ? t.mobileTitleReady : t.mobileTitleSoon}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-margin">
          {mobileReady ? t.mobileLeadReady : t.mobileLeadSoon}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <StoreBadge store="ios" downloadOn={t.badgeDownloadOn} comingTo={t.badgeComingTo} />
          <StoreBadge store="android" downloadOn={t.badgeDownloadOn} comingTo={t.badgeComingTo} />
        </div>
        {!mobileReady && (
          <p className="mt-4 text-xs text-margin">{t.mobileNote}</p>
        )}
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-signal">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-14 text-center">
          <h2 className="text-2xl font-medium tracking-tight text-white">
            {t.ctaTitle}
          </h2>
          <p className="max-w-xl text-white/85">{t.ctaLead}</p>
          <Link
            href={dashboardHref ?? "/signup"}
            className="mt-2 rounded-md bg-white px-6 py-3 text-sm font-medium text-signal transition hover:bg-white/90"
          >
            {dashboardHref ? t.goToDashboard : t.ctaButton}
          </Link>
        </div>
      </section>
    </main>
  );
}

/* --------------------------- sub-components ----------------------- */
const TONE: Record<string, string> = {
  ink: "border-ink/15 text-ink",
  signal: "border-signal/30 text-signal",
  verified: "border-verified/30 text-verified",
};

function FlowChip({
  color,
  label,
  sub,
}: {
  color: keyof typeof TONE;
  label: string;
  sub: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-paper px-5 py-4 text-center ${TONE[color]}`}
    >
      <p className="font-medium">{label}</p>
      <p className="text-xs text-margin">{sub}</p>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center text-margin">
      <span className="text-xs">{label}</span>
      <span className="rotate-90 text-lg leading-none sm:rotate-0">→</span>
    </div>
  );
}

function SplitCard({
  color,
  who,
  what,
}: {
  color: keyof typeof TONE;
  who: string;
  what: string;
}) {
  return (
    <div className={`rounded-lg border bg-paper p-4 ${TONE[color]}`}>
      <p className="font-medium">{who}</p>
      <p className="text-sm text-margin">{what}</p>
    </div>
  );
}

function RoleCard({
  icon,
  title,
  tagline,
  benefits,
}: {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  benefits: string[];
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-parchment text-signal">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="text-sm text-margin">{tagline}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {benefits.map((b) => (
          <Benefit key={b}>{b}</Benefit>
        ))}
      </ul>
    </div>
  );
}

function Why({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-parchment text-signal">
        {icon}
      </div>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-margin">{text}</p>
    </div>
  );
}
