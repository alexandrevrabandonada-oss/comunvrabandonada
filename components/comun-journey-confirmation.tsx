import Link from "next/link";

export function ComunJourneyConfirmation({
  eyebrow = "Contribuição recebida",
  title,
  status,
  whatHappened,
  privacy,
  next,
  trackingHref,
  trackingLabel = "Acompanhar participação",
  returnHref,
  returnLabel,
  correctionHref,
  correctionLabel = "Pedir correção ou retirada",
  protocol,
}: {
  eyebrow?: string;
  title: string;
  status: string;
  whatHappened: string;
  privacy: string;
  next: string;
  trackingHref: string;
  trackingLabel?: string;
  returnHref: string;
  returnLabel: string;
  correctionHref: string;
  correctionLabel?: string;
  protocol?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="journey-confirmation-title"
      className="comun-v2-page comun-v2-page--reading"
      data-comun-journey-stage="confirm"
    >
      <div
        role="status"
        aria-live="polite"
        className="surface-result rounded-[var(--comun-radius-community)] border border-comun-black/20 p-5 sm:p-7"
      >
        <div
          className="grid size-14 place-items-center rounded-full bg-comun-yellow text-2xl font-black"
          aria-hidden="true"
        >
          ✓
        </div>
        <p className="comun-v2-eyebrow mt-5">{eyebrow}</p>
        <h1
          id="journey-confirmation-title"
          className="comun-v2-title mt-2 normal-case"
        >
          {title}
        </h1>
        <span className="comun-v2-status mt-4 inline-flex rounded-[var(--comun-radius-pill)] bg-comun-yellow px-3 py-2">
          {status}
        </span>
        {protocol ? <div className="mt-5">{protocol}</div> : null}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <JourneyFact term="O que aconteceu">{whatHappened}</JourneyFact>
        <JourneyFact term="Privacidade">{privacy}</JourneyFact>
        <JourneyFact term="O que acontece agora">{next}</JourneyFact>
      </dl>

      <p className="mt-5 border-l-4 border-comun-yellow pl-4 text-sm text-comun-paper/80">
        Este processo pode pedir complemento, seguir para publicação ou ser
        encerrado. Por isso, as etapas não são exibidas como uma linha
        obrigatória.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href={trackingHref} className="comun-v2-action justify-center">
          {trackingLabel}
        </Link>
        <Link
          href={returnHref}
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--comun-radius-control)] border-2 border-comun-paper px-4 font-black text-comun-paper"
        >
          {returnLabel}
        </Link>
      </div>
      <Link
        href={correctionHref}
        className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-comun-paper underline"
      >
        {correctionLabel}
      </Link>
    </section>
  );
}

function JourneyFact({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-paper rounded-[var(--comun-radius-card)] border border-comun-black/20 p-4">
      <dt className="comun-v2-eyebrow">{term}</dt>
      <dd className="mt-2 text-sm text-comun-black/70">{children}</dd>
    </div>
  );
}
