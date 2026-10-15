"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComunExperience } from "@/lib/comun-experience";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  COMUN_SOLIDARITY_CONTACT_CONSENT_COPY,
  initialSolidarityConnectionActionState,
  type SolidarityConnectionActionState,
} from "@/lib/comun-solidarity-private-connections";
import {
  createConnectionDraftStore,
  clearSolidarityConnectionDrafts,
  SOLIDARITY_SESSION_CHANNEL,
  readConnectionDraft,
  saveConnectionDraft,
  type ConnectionDraftContext,
} from "@/lib/comun-solidarity-connection-draft";

type Props = {
  action: (
    state: SolidarityConnectionActionState,
    formData: FormData,
  ) => Promise<SolidarityConnectionActionState>;
  experience?: ComunExperience;
  fromDirectory?: boolean;
  draftOwner: string | null;
  formIdentity: string | null;
  subjectKind: "offer" | "need";
  subjectId: string;
  subjectSlug: string;
  subjectTitle: string;
  organizationSlug: string;
  organizationTerritoryId: string;
  initialRequestId: string;
};

export function SolidarityConnectionForm(props: Props) {
  // A changed identity/login/item remounts the form, clearing ALL memory fields.
  return (
    <ConnectionForm
      key={`${props.draftOwner ?? props.formIdentity}:${props.subjectKind}:${props.subjectId}:${props.organizationTerritoryId}`}
      {...props}
    />
  );
}
const storage = () => window.sessionStorage;

function ConnectionForm({
  action,
  draftOwner,
  formIdentity,
  subjectKind,
  subjectId,
  subjectSlug,
  subjectTitle,
  organizationSlug,
  organizationTerritoryId,
  initialRequestId,
  experience = "app-v2",
  fromDirectory = false,
}: Props) {
  const router = useRouter();
  const [logoutNotice, setLogoutNotice] = useState(false);
  const [sessionCheck, setSessionCheck] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    action,
    initialSolidarityConnectionActionState,
  );
  // Same initial render on server/client. Storage is read after hydration, never restored here.
  const [draft, setDraft] = useState({
    requestId: initialRequestId,
    message: "",
    contact: "",
    consent: false,
  });
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");

  const messageRef = useRef<HTMLTextAreaElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const context: ConnectionDraftContext = {
    owner: draftOwner,
    subjectKind,
    subjectId,
    organizationTerritoryId,
  };
  const success = state.state === "success";
  const sessionChanged =
    state.state === "error" && state.sessionChanged === true;
  const authenticated = Boolean(formIdentity);

  const [draftStore] = useState(() =>
    createConnectionDraftStore(storage, context),
  );
  const storageStatus = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getSnapshot,
    draftStore.getServerSnapshot,
  );
  const offered = storageStatus === "available" && !recoveryDismissed;
  const storageAvailable =
    storageStatus !== "checking" && storageStatus !== "unavailable";
  const effectiveNotice =
    storageNotice ||
    (["discard_failed", "unavailable"].includes(storageStatus)
      ? "O armazenamento local não está disponível por completo. Seu texto fica só em memória; não há garantia de salvamento ou descarte no navegador."
      : "");
  // Adjust memory before committing a changed action result, rather than an effect cascade.
  const [previousResult, setPreviousResult] = useState(state);
  if (previousResult !== state) {
    setPreviousResult(state);
    if (success || sessionChanged) {
      setDraft({
        requestId: initialRequestId,
        message: "",
        contact: "",
        consent: false,
      });
      setRecoveryDismissed(true);
    } else if (state.state === "auth_required") {
      setDraft((current) => ({ ...current, contact: "", consent: false }));
    }
  }

  useEffect(() => {
    if (success || sessionChanged) draftStore.discard();
    if (state.state === "success" || state.state === "auth_required")
      feedbackRef.current?.focus();
    else if (state.state === "error") {
      if (state.field === "message") messageRef.current?.focus();
      else if (state.field === "contact") contactRef.current?.focus();
      else if (state.field === "consent") consentRef.current?.focus();
      else feedbackRef.current?.focus();
    }
  }, [
    state,
    success,
    sessionChanged,
    draftOwner,
    subjectKind,
    subjectId,
    organizationTerritoryId,
    initialRequestId,
    draftStore,
  ]);

  useEffect(() => {
    const clearPrivateInputs = () => {
      setDraft((current) => ({
        ...current,
        message: "",
        contact: "",
        consent: false,
      }));
      draftStore.suspend();
    };
    const revalidateHistory = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    // Only opaque context notifications cross tabs; they grant no authority and carry no draft/contact.
    const needsCheck = { current: false };
    let logoutRequested = false;
    const pause = () => {
      needsCheck.current = true;
      setSessionCheck(initialRequestId);
      setDraft((current) => ({ ...current, contact: "", consent: false }));
    };
    const resume = () => {
      if (!needsCheck.current || logoutRequested) return;
      needsCheck.current = false;
      router.refresh();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") pause();
      else resume();
    };
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel(SOLIDARITY_SESSION_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (
          data &&
          typeof data === "object" &&
          Object.keys(data).length === 1 &&
          data.type === "logout-requested"
        ) {
          logoutRequested = true;
          clearPrivateInputs();
          clearSolidarityConnectionDrafts(storage);
          setRecoveryDismissed(true);
          setLogoutNotice(true);
          pause();
          return;
        }
        const opaque = (value: unknown) =>
          value === null ||
          (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
        if (
          !data ||
          typeof data !== "object" ||
          Object.keys(data).sort().join(",") !== "identity,login,type" ||
          data.type !== "validated-form-context" ||
          !opaque(data.identity) ||
          !opaque(data.login)
        )
          return;
        if (data.identity !== formIdentity || data.login !== draftOwner) {
          clearPrivateInputs();
          pause();
          resume();
        }
      };
      channel.postMessage({
        type: "validated-form-context",
        identity: formIdentity,
        login: draftOwner,
      });
    } catch {
      channel?.close();
      channel = undefined;
    }
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", clearPrivateInputs);
    window.addEventListener("pageshow", revalidateHistory);
    return () => {
      channel?.close();
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", clearPrivateInputs);
      window.removeEventListener("pageshow", revalidateHistory);
    };
  }, [draftStore, initialRequestId, draftOwner, formIdentity, router]);

  function recover() {
    const saved = readConnectionDraft(storage, context);
    if (saved.status !== "available") {
      setRecoveryDismissed(true);
      setStorageNotice(
        "O rascunho expirou, não é compatível ou não pode ser lido. O texto atual permanece em memória.",
      );
      return;
    }
    setDraft({
      requestId: saved.draft.requestId,
      message: saved.draft.message,
      contact: "",
      consent: false,
    });
    setRecoveryDismissed(true);
    setStorageNotice(
      "Mensagem recuperada. Informe o contato e confirme a autorização atuais antes de enviar.",
    );
    messageRef.current?.focus();
  }
  function save() {
    const saved = saveConnectionDraft(
      storage,
      context,
      draft.requestId,
      draft.message,
    );
    setStorageNotice(
      saved
        ? "Somente a mensagem foi salva nesta aba por até 30 minutos. Contato e autorização não foram salvos."
        : "Não foi possível salvar. Seu texto permanece somente em memória nesta página.",
    );
  }
  function discard() {
    const removed = draftStore.discard();
    setRecoveryDismissed(true);
    setStorageNotice(
      removed
        ? "Rascunho local descartado; o texto atual permanece em memória."
        : "Não foi possível remover o rascunho no navegador. Ele não será recuperado nesta página.",
    );
  }
  const describedBy =
    state.state === "error" ? "connection-feedback" : undefined;
  const focusClass =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";

  if (sessionCheck === initialRequestId || sessionChanged || logoutNotice)
    return (
      <div
        ref={feedbackRef}
        tabIndex={-1}
        role={sessionChanged ? "alert" : "status"}
        className="border-2 border-comun-black bg-white p-5 text-comun-black"
      >
        <p>
          {logoutNotice
            ? "A saída foi solicitada em outra aba. Reabra este item para conferir a sessão atual."
            : sessionChanged
              ? "Sua sessão mudou. Reabra este item e confirme novamente o contato e a autorização antes de enviar."
              : "Conferindo a sessão antes de mostrar a mensagem. Contato e autorização precisam ser confirmados novamente."}
        </p>
        <button
          type="button"
          className="mt-3 min-h-11 font-black underline"
          onClick={() => window.location.reload()}
        >
          Reabrir este item
        </button>
      </div>
    );
  if (success)
    return (
      <div
        ref={feedbackRef}
        role="status"
        tabIndex={-1}
        className="border-2 border-comun-black bg-white p-5 text-comun-black"
      >
        <h2 className="text-2xl font-black">
          {state.replayed ? "Conexão já registrada" : "Conexão enviada"}
        </h2>
        <p className="mt-2">
          {state.replayed
            ? "Não criamos outra conexão nem atualizamos o contato anterior. Consulte o estado já registrado."
            : "A organização recebeu sua mensagem. Seu contato continua protegido até que ela aceite."}
        </p>
        <p className="mt-2 text-sm">
          {storageStatus === "discard_failed"
            ? "O navegador não permitiu remover o rascunho local. Não há garantia de apagamento dos dados do site."
            : "Rascunho local descartado."}
        </p>
        <Link
          className={`mt-4 inline-flex min-h-11 items-center font-black underline ${focusClass}`}
          href={state.href}
        >
          Acompanhar em Minha participação
        </Link>
      </div>
    );

  return (
    <form
      action={formAction}
      className="grid gap-5 bg-comun-paper p-4 text-comun-black sm:p-6"
      aria-describedby={describedBy}
    >
      <input type="hidden" name="form_context" value={formIdentity ?? ""} />
      <input type="hidden" name="login_context" value={draftOwner ?? ""} />
      <input type="hidden" name="experiencia" value={experience} />
      <input
        type="hidden"
        name="journey_origin"
        value={fromDirectory ? "feirinha" : "organizacao"}
      />
      <input type="hidden" name="request_id" value={draft.requestId} />
      <input type="hidden" name="subject_kind" value={subjectKind} />
      <input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="subject_slug" value={subjectSlug} />
      <input type="hidden" name="organization_slug" value={organizationSlug} />
      <input
        type="hidden"
        name="organization_territory_id"
        value={organizationTerritoryId}
      />
      <label className="grid gap-2 font-bold">
        Sua mensagem para a organização
        <textarea
          ref={messageRef}
          name="connection_message"
          minLength={10}
          maxLength={600}
          required
          value={draft.message}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              message: event.target.value,
            }));
            setStorageNotice(
              "Alterações apenas em memória; salve explicitamente se quiser retomar nesta aba.",
            );
          }}
          className={`min-h-36 border-2 border-comun-black bg-white p-3 font-normal ${focusClass}`}
          aria-describedby="connection-message-help"
          aria-invalid={state.state === "error" && state.field === "message"}
        />
      </label>
      <p id="connection-message-help" className="-mt-3 text-sm">
        Conte por que você se interessou por “{subjectTitle}”. Não coloque
        contato ou dados sensíveis na mensagem.
      </p>
      <section
        aria-label="Rascunho privado da mensagem"
        className="border-2 border-comun-black bg-white p-4 text-sm"
      >
        <p>
          {draftOwner
            ? "Rascunho opcional, só da mensagem, nesta aba e neste login por até 30 minutos. Não use em aparelho compartilhado."
            : authenticated
              ? "Recuperação local indisponível neste login. A mensagem fica apenas em memória; contato e autorização continuam obrigatórios."
              : "Antes de entrar, seu texto fica apenas em memória. Se quiser levá-lo, selecione e copie manualmente; ele não será associado automaticamente à conta que entrar."}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              messageRef.current?.focus();
              messageRef.current?.select();
            }}
            className={`min-h-11 font-black underline ${focusClass}`}
          >
            Selecionar texto para copiar
          </button>
          {draftOwner ? (
            <>
              <button
                type="button"
                disabled={pending || !storageAvailable}
                onClick={save}
                className={`min-h-11 font-black underline disabled:opacity-60 ${focusClass}`}
              >
                Salvar somente mensagem
              </button>
              <button
                type="button"
                onClick={discard}
                className={`min-h-11 font-black underline ${focusClass}`}
              >
                Descartar rascunho salvo
              </button>
            </>
          ) : null}
          {offered && draftOwner ? (
            <button
              type="button"
              onClick={recover}
              className={`min-h-11 font-black underline ${focusClass}`}
            >
              Recuperar mensagem salva
            </button>
          ) : null}
        </div>
        <p role="status" className="mt-2">
          {storageNotice}
        </p>
      </section>
      {authenticated ? (
        <>
          <label className="grid gap-2 font-bold">
            Contato protegido
            <input
              ref={contactRef}
              autoComplete="off"
              name="protected_contact"
              minLength={3}
              maxLength={200}
              required
              value={draft.contact}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  contact: event.target.value,
                }))
              }
              className={`min-h-12 border-2 border-comun-black bg-white px-3 font-normal ${focusClass}`}
              aria-describedby="connection-contact-help"
              aria-invalid={
                state.state === "error" && state.field === "contact"
              }
            />
          </label>
          <p id="connection-contact-help" className="-mt-3 text-sm">
            Pode ser telefone, e-mail ou identificador. Não envie CPF,
            documento, senha ou endereço residencial.
          </p>
          <label className="flex items-start gap-3 border-2 border-comun-black bg-white p-4 text-sm font-bold">
            <input
              ref={consentRef}
              type="checkbox"
              name="consent_to_contact"
              value="yes"
              checked={draft.consent}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  consent: event.target.checked,
                }))
              }
              className={`mt-1 size-5 shrink-0 ${focusClass}`}
              aria-invalid={
                state.state === "error" && state.field === "consent"
              }
              required
            />
            <span>{COMUN_SOLIDARITY_CONTACT_CONSENT_COPY}</span>
          </label>
        </>
      ) : (
        <p className="bg-white p-3 text-sm">
          Contato e autorização serão solicitados após entrar na conta.
        </p>
      )}
      {state.state === "error" ? (
        <p
          ref={feedbackRef}
          tabIndex={-1}
          id="connection-feedback"
          role="alert"
          className="border-2 border-comun-rust bg-white p-4 font-bold"
        >
          {state.message}
        </p>
      ) : null}
      {state.state === "auth_required" ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          role="status"
          className="border-2 border-comun-black bg-white p-4"
        >
          <p>{state.message}</p>
          <Link
            className={`mt-3 inline-flex min-h-11 items-center font-black underline ${focusClass}`}
            href={state.loginHref}
          >
            Entrar para continuar
          </Link>
        </div>
      ) : null}
      <button
        disabled={pending || !draft.requestId}
        className={`min-h-12 justify-self-start border-2 border-comun-black bg-comun-yellow px-5 font-black disabled:opacity-60 ${focusClass}`}
      >
        {pending
          ? "Enviando…"
          : !authenticated
            ? "Entrar antes de enviar"
            : subjectKind === "offer"
              ? "Enviar interesse"
              : "Oferecer ajuda"}
      </button>
      <p className="bg-white p-2 text-sm">
        Isto não cria pedido, compra, reserva, contrato nem conversa automática.
      </p>
    </form>
  );
}
