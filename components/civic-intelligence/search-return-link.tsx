"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  safeSearchDestination,
  searchReturnHref,
} from "@/lib/public-search-context";
export function SearchReturnLink() {
  const query = useSearchParams();
  const path = usePathname();
  const href = searchReturnHref(query.get("busca"));
  if (
    !safeSearchDestination(
      path +
        (query.get("resultado")
          ? `?resultado=${encodeURIComponent(query.get("resultado")!)}`
          : ""),
    ) ||
    !href
  )
    return null;
  return (
    <nav
      aria-label="Retorno à busca"
      className="mx-auto w-full max-w-6xl px-4 pt-4"
    >
      <Link
        href={href}
        prefetch={false}
        className="inline-flex min-h-11 items-center font-bold underline focus-visible:outline focus-visible:outline-2"
      >
        Voltar aos resultados da busca
      </Link>
    </nav>
  );
}
