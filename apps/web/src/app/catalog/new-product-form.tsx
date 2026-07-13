"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_CATEGORIES } from "./categories";
import { useT } from "@/i18n/client";

type VariantInput = { variant_name: string; net_price: string; weight: string };

const EMPTY_PRODUCT = { name: "", brand: "", category: "" };
const EMPTY_VARIANT: VariantInput = { variant_name: "", net_price: "", weight: "1000" };

export function NewProductForm() {
  const t = useT().newProduct;
  const router = useRouter();
  const supabase = createClient();
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [variants, setVariants] = useState<VariantInput[]>([{ ...EMPTY_VARIANT }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setProductField(key: keyof typeof EMPTY_PRODUCT, value: string) {
    setProduct((p) => ({ ...p, [key]: value }));
  }
  function setVariant(i: number, patch: Partial<VariantInput>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function addVariant() {
    setVariants((vs) => [...vs, { ...EMPTY_VARIANT }]);
  }
  function removeVariant(i: number) {
    setVariants((vs) => (vs.length > 1 ? vs.filter((_, idx) => idx !== i) : vs));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Keep only fully-filled variant rows.
    const rows = variants.filter(
      (v) => v.variant_name.trim() !== "" && v.net_price !== "",
    );
    if (rows.length === 0) {
      setError(t.needVariant);
      setBusy(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t.notSignedIn);
      setBusy(false);
      return;
    }

    // 1) Create the product (RLS: manufacturer_id must equal me).
    const { data: created, error: pErr } = await supabase
      .from("products")
      .insert({
        manufacturer_id: user.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
      })
      .select("id")
      .single();
    if (pErr || !created) {
      setError(pErr?.message ?? t.couldNotCreate);
      setBusy(false);
      return;
    }

    // 2) Create ALL its variants in one insert.
    const { error: vErr } = await supabase.from("product_variants").insert(
      rows.map((v) => ({
        product_id: created.id,
        variant_name: v.variant_name.trim(),
        net_price: Number(v.net_price),
        weight: Number(v.weight) || 1000,
      })),
    );
    setBusy(false);
    if (vErr) {
      setError(vErr.message);
      return;
    }

    // Reset the form.
    setProduct(EMPTY_PRODUCT);
    setVariants([{ ...EMPTY_VARIANT }]);
    router.refresh();
  }

  const inputClass =
    "rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20";

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-white p-4"
    >
      {/* Product fields */}
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          placeholder={t.productName}
          value={product.name}
          onChange={(e) => setProductField("name", e.target.value)}
          className={`${inputClass} col-span-2`}
        />
        <input
          required
          placeholder={t.brand}
          value={product.brand}
          onChange={(e) => setProductField("brand", e.target.value)}
          className={inputClass}
        />
        <select
          required
          value={product.category}
          onChange={(e) => setProductField("category", e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            {t.selectCategory}
          </option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Variants */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-margin">{t.variants}</span>
        {variants.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              placeholder={t.variantPlaceholder}
              value={v.variant_name}
              onChange={(e) => setVariant(i, { variant_name: e.target.value })}
              className={`${inputClass} flex-1`}
            />
            <div className="relative w-32">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-margin">
                Rp
              </span>
              <input
                type="number"
                min={0}
                placeholder={t.netPrice}
                value={v.net_price}
                onChange={(e) => setVariant(i, { net_price: e.target.value })}
                className={`${inputClass} w-full pl-9`}
              />
            </div>
            <div className="relative w-28">
              <input
                type="number"
                min={0}
                placeholder={t.weight}
                value={v.weight}
                onChange={(e) => setVariant(i, { weight: e.target.value })}
                className={`${inputClass} w-full pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-margin">
                g
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeVariant(i)}
              disabled={variants.length === 1}
              aria-label={t.removeVariant}
              className="rounded-md border border-border px-2.5 py-2 text-sm text-margin transition hover:bg-parchment disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addVariant}
          className="self-start text-sm text-signal hover:underline"
        >
          {t.addVariant}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <span className="text-xs text-margin">{t.footerNote}</span>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 disabled:opacity-50"
        >
          {busy ? t.adding : t.addProduct}
        </button>
      </div>
    </form>
  );
}
