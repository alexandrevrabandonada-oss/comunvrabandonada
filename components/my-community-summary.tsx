import Link from "next/link";
import { getCommunityExperience } from "@/lib/community-experience";
export function MyCommunitySummary({
  memberships,
  compact = false,
}: {
  memberships: any[];
  compact?: boolean;
}) {
  if (!memberships.length) return null;
  return (
    <section
      aria-labelledby={compact ? "home-communities" : "area-communities"}
      className="mx-auto w-full max-w-7xl px-4 py-5"
    >
      <header className="mb-3 border-b-2 border-comun-yellow pb-3">
        <h2
          id={compact ? "home-communities" : "area-communities"}
          className="text-2xl font-black uppercase text-comun-yellow"
        >
          {compact ? "Nas suas comunidades" : "Comunidades acompanhadas"}
        </h2>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {memberships.map((x) => {
          const c = Array.isArray(x.community) ? x.community[0] : x.community,
            experience = getCommunityExperience(c?.slug);
          return c ? (
            <Link
              key={x.id}
              href={`/comun/c/${c.slug}`}
              className="border-2 border-comun-yellow p-4"
            >
              <span className="text-xs font-black uppercase text-comun-yellow">
                {x.state}
              </span>
              <strong className="mt-2 block uppercase">{c.name}</strong>
              <p className="mt-2 text-sm text-comun-paper/70">
                Próxima ação: {experience?.nextAction ?? c.short_description}
              </p>
            </Link>
          ) : null;
        })}
      </div>
    </section>
  );
}
