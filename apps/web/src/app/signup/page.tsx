"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/password-input";
import { LocationPicker, type LatLng } from "./location-picker";
import { useT } from "@/i18n/client";

type Role = "warung" | "manufacturer" | "distributor";

const ROLE_VALUES: Role[] = ["warung", "manufacturer", "distributor"];

// Accepts "08…", "8…", "+62…", or "62…" and returns the canonical "+62…" form,
// or null if it isn't a valid Indonesian mobile number (08 + 8–12 digits).
function normalizePhone(raw: string): string | null {
    let d = raw.replace(/[\s\-()]/g, "");
    if (d.startsWith("+")) d = d.slice(1);
    if (d.startsWith("0")) d = "62" + d.slice(1);
    else if (d.startsWith("8")) d = "62" + d;
    if (!d.startsWith("62")) return null;
    const local = d.slice(2); // digits after the 62 country code
    if (!/^8\d{8,12}$/.test(local)) return null;
    return "+" + d;
}

export default function SignupPage() {
    const t = useT();
    const router = useRouter();
    const supabase = createClient();
    const roleLabels: Record<Role, string> = {
        warung: t.signup.roleWarung,
        manufacturer: t.signup.roleManufacturer,
        distributor: t.signup.roleDistributor,
    };
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [businessName, setBusinessName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [loc, setLoc] = useState<LatLng | null>(null);
    const [role, setRole] = useState<Role>("warung");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
            setError(t.signup.phoneInvalid);
            setLoading(false);
            return;
        }

        // The metadata here lands in auth.users.raw_user_meta_data, which the
        // handle_new_user trigger reads to create the accounts + party rows.
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    full_name: fullName,
                    business_name: businessName,
                    phone: normalizedPhone,
                    address,
                    latitude: loc?.lat != null ? String(loc.lat) : "",
                    longitude: loc?.lng != null ? String(loc.lng) : "",
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }
        if (!data.session) {
            // Only happens if email confirmation is enabled (not our local default).
            setError(t.signup.confirmEmail);
            setLoading(false);
            return;
        }

        const home =
            role === "manufacturer"
                ? "/catalog"
                : role === "distributor"
                    ? "/logistics"
                    : "/orders";
        router.push(home);
        router.refresh();
    }

    const businessLabel = role === "warung" ? t.signup.shopName : t.signup.companyName;
    const inputClass =
        "rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20";

    return (
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-16">
            <div>
                <h1 className="text-2xl font-medium tracking-tight">{t.signup.title}</h1>
                <p className="mt-1 text-sm text-margin">{t.signup.lead}</p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="rounded-lg border border-border bg-white p-6"
            >
                <div className="grid items-start gap-6 md:grid-cols-2">
                    {/* Left — account details */}
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.iAmA}</span>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as Role)}
                                className={inputClass}
                            >
                                {ROLE_VALUES.map((v) => (
                                    <option key={v} value={v}>
                                        {roleLabels[v]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.yourName}</span>
                            <input
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className={inputClass}
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{businessLabel}</span>
                            <input
                                required
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className={inputClass}
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.phone}</span>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onBlur={() => {
                                    const n = normalizePhone(phone);
                                    if (n) setPhone(n);
                                }}
                                placeholder="08123456789"
                                className={inputClass}
                            />
                            <span className="text-xs text-margin">
                            </span>
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.email}</span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputClass}
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.password}</span>
                            <PasswordInput
                                value={password}
                                onChange={setPassword}
                                required
                                minLength={6}
                            />
                        </label>
                    </div>

                    {/* Right — address + map pin (larger) */}
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.address}</span>
                            <textarea
                                required
                                rows={3}
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t.signup.addressPlaceholder}
                                className={inputClass}
                            />
                        </label>

                        <div className="flex flex-col gap-1.5 text-sm">
                            <span className="text-margin">{t.signup.pinLocation}</span>
                            <LocationPicker value={loc} onChange={setLoc} height="300px" />
                        </div>
                    </div>
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="mt-6 w-full rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
                >
                    {loading ? t.signup.creating : t.signup.createButton}
                </button>

                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </form>

            <p className="text-sm text-margin">
                {t.signup.alreadyHave}{" "}
                <Link href="/login" className="text-signal hover:underline">
                    {t.common.signIn}
                </Link>
            </p>
        </main>
    );
}
