"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_CATEGORIES } from "./categories";
import { useT } from "@/i18n/client";

type Variant = {
    id: string;
    variant_name: string;
    net_price: number;
    weight: number;
    is_active: boolean;
};
type Product = {
    id: string;
    name: string;
    brand: string;
    category: string;
    is_active: boolean;
    product_variants: Variant[];
};

const inputClass =
    "rounded-md border border-border bg-paper px-2 py-1 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20";

export function EditableProduct({
    product,
    feeRate,
}: {
    product: Product;
    feeRate: number;
}) {
    const dict = useT();
    const t = dict.editable;
    const router = useRouter();
    const supabase = createClient();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editable copies (reset from props whenever we re-enter edit mode).
    const [name, setName] = useState(product.name);
    const [brand, setBrand] = useState(product.brand);
    const [category, setCategory] = useState(product.category);
    const [active, setActive] = useState(product.is_active);
    const [variants, setVariants] = useState<Variant[]>(product.product_variants);

    function startEditing() {
        setName(product.name);
        setBrand(product.brand);
        setCategory(product.category);
        setActive(product.is_active);
        setVariants(product.product_variants);
        setError(null);
        setEditing(true);
    }

    function patchVariant(id: string, patch: Partial<Variant>) {
        setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    }

    async function save() {
        setBusy(true);
        setError(null);

        const { error: pErr } = await supabase
            .from("products")
            .update({ name, brand, category, is_active: active })
            .eq("id", product.id);
        if (pErr) {
            setError(pErr.message);
            setBusy(false);
            return;
        }

        for (const v of variants) {
            const { error: vErr } = await supabase
                .from("product_variants")
                .update({
                    variant_name: v.variant_name,
                    net_price: v.net_price,
                    weight: v.weight,
                    is_active: v.is_active,
                })
                .eq("id", v.id);
            if (vErr) {
                setError(vErr.message);
                setBusy(false);
                return;
            }
        }

        setBusy(false);
        setEditing(false);
        router.refresh();
    }

    // ---- read-only view ----
    if (!editing) {
        return (
            <div className="overflow-hidden rounded-lg border border-border bg-white">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="font-medium">
                        {product.brand} - {product.name}
                        {!product.is_active && (
                            <span className="ml-2 rounded-full bg-parchment px-2 py-0.5 text-xs text-margin">
                                {t.inactive}
                            </span>
                        )}
                    </span>
                    <span className="flex items-center gap-3">
                        <span className="text-xs text-margin">{product.category}</span>
                        <button
                            onClick={startEditing}
                            className="rounded-md border border-border px-2.5 py-1 text-xs text-signal transition hover:bg-parchment"
                        >
                            {t.edit}
                        </button>
                    </span>
                </div>
                <ul className="divide-y divide-border text-sm">
                    {product.product_variants.map((v) => {
                        const sell = Math.round(v.net_price * (1 + feeRate));
                        return (
                            <li
                                key={v.id}
                                className="flex items-center justify-between px-4 py-2.5"
                            >
                                <span className={v.is_active ? "" : "text-margin line-through"}>
                                    {v.variant_name}
                                    <span className="ml-1 text-xs text-margin">
                                        · {v.weight} g
                                    </span>
                                </span>
                                <span className="text-margin tabular-nums">
                                    {t.net} Rp.{v.net_price.toLocaleString("id-ID")}
                                    <span className="mx-1">→</span>
                                    <span className="font-medium text-ink">
                                        {t.sells} Rp.{sell.toLocaleString("id-ID")}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    // ---- edit view ----
    return (
        <div className="overflow-hidden rounded-lg border border-signal/40 bg-white">
            <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
                <input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder={t.brand}
                    className={inputClass}
                />
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.name}
                    className={inputClass}
                />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                >
                    {category !== "" &&
                        !(PRODUCT_CATEGORIES as readonly string[]).includes(
                            category,
                        ) && <option value={category}>{category}</option>}
                    {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <label className="col-span-3 flex items-center gap-2 text-sm text-margin">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                    />
                    {t.activeLabel}
                </label>
            </div>

            <ul className="divide-y divide-border p-3">
                {variants.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 py-2">
                        <input
                            value={v.variant_name}
                            onChange={(e) => patchVariant(v.id, { variant_name: e.target.value })}
                            placeholder={t.variant}
                            className={`${inputClass} flex-1`}
                        />
                        <div className="relative w-28">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-margin">
                                Rp
                            </span>
                            <input
                                type="number"
                                min={0}
                                value={v.net_price}
                                onChange={(e) =>
                                    patchVariant(v.id, { net_price: Math.max(0, Number(e.target.value)) })
                                }
                                placeholder={t.netPrice}
                                className={`${inputClass} w-full pl-9 text-right`}
                            />
                        </div>
                        <div className="relative w-24">
                            <input
                                type="number"
                                min={0}
                                value={v.weight}
                                onChange={(e) =>
                                    patchVariant(v.id, { weight: Math.max(0, Number(e.target.value)) })
                                }
                                placeholder={t.weight}
                                className={`${inputClass} w-full pr-7 text-right`}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-margin">
                                g
                            </span>
                        </div>
                        <label className="flex items-center gap-1 text-xs text-margin">
                            <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={(e) => patchVariant(v.id, { is_active: e.target.checked })}
                            />
                            {t.active}
                        </label>
                    </li>
                ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-border p-3">
                {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                ) : (
                    <span className="text-xs text-margin">{t.wholeRupiah}</span>
                )}
                <span className="flex items-center gap-2">
                    <button
                        onClick={() => setEditing(false)}
                        disabled={busy}
                        className="rounded-md border border-border px-3 py-1.5 text-sm text-margin transition hover:bg-parchment disabled:opacity-50"
                    >
                        {dict.common.cancel}
                    </button>
                    <button
                        onClick={save}
                        disabled={busy}
                        className="rounded-md bg-signal px-4 py-1.5 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
                    >
                        {busy ? t.saving : t.saveChanges}
                    </button>
                </span>
            </div>
        </div>
    );
}
