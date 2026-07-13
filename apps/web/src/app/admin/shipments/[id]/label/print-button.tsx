"use client";

// A print trigger that hides itself in the printed output (print:hidden).
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition hover:bg-signal/90 print:hidden"
    >
      {label}
    </button>
  );
}
