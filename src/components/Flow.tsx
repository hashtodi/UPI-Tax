"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { inr, parseAmount, type Kind, type Who } from "@/lib/rules";
import { resultPath } from "@/lib/share";

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "small", label: "Small shop", hint: "Kirana, chaiwala, local store" },
  { value: "big", label: "Big shop or brand", hint: "Chain, D2C, mall, app" },
  {
    value: "fuel",
    label: "Petrol, recharge, insurance, bills",
    hint: "Also railways, electricity, water, piped gas",
  },
  { value: "capital", label: "Stocks or mutual funds", hint: "Broker, AMC, capital markets" },
];

const CHIPS = [500, 1999, 2001, 5000, 50000, 100000];

export function Flow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<Who | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  const amt = parseAmount(amount);

  function pickWho(next: Who) {
    setWho(next);
    if (next === "person") {
      setKind("na");
      setStep(2);
    } else {
      setKind(null);
      setStep(1);
    }
  }

  function pickKind(next: Kind) {
    setKind(next);
    setStep(2);
  }

  function back() {
    if (step === 2 && who === "person") setStep(0);
    else setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    if (!who || !kind || amt <= 0) return;
    setPending(true);
    router.push(resultPath(who, kind, amt));
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="-ml-1 flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeftIcon size={15} weight="bold" />
            Back
          </button>
        ) : (
          <span className="text-[13px] font-medium text-ink-3">Three taps</span>
        )}
        <div className="ml-auto flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-[3px] w-6 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-accent" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="rise">
          <h2 className="text-[19px] font-semibold tracking-tight">Who are you paying?</h2>
          <div className="mt-4 grid gap-3">
            <OptionButton label="A person" hint="Friend, family, landlord, yourself" onClick={() => pickWho("person")} />
            <OptionButton label="A shop or business" hint="Anyone with a storefront or an app" onClick={() => pickWho("shop")} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="rise">
          <h2 className="text-[19px] font-semibold tracking-tight">What kind?</h2>
          <div className="mt-4 grid gap-3">
            {KINDS.map((k) => (
              <OptionButton key={k.value} label={k.label} hint={k.hint} onClick={() => pickKind(k.value)} />
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rise">
          <h2 className="text-[19px] font-semibold tracking-tight">How much?</h2>

          <label htmlFor="amount" className="sr-only">
            Amount in rupees
          </label>
          <div className="mt-4 flex items-baseline gap-2 border-b-2 border-line pb-3 transition-colors focus-within:border-accent">
            <span className="text-3xl font-semibold text-ink-3">&#8377;</span>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              autoFocus
              className="tnum w-full bg-transparent text-4xl font-semibold tracking-tight text-ink outline-none placeholder:text-ink-3/50"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAmount(String(c))}
                className="tnum min-h-[40px] rounded-full border border-line bg-surface-2 px-3.5 text-[13px] font-medium text-ink-2 transition-colors hover:border-accent/40 hover:text-ink active:scale-[0.98]"
              >
                {inr(c)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={amt <= 0 || pending}
            className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-[15px] font-semibold text-black transition-[transform,opacity] hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {pending ? "Checking" : "Will I pay?"}
            {!pending && <ArrowRightIcon size={17} weight="bold" />}
          </button>
        </div>
      )}
    </div>
  );
}

function OptionButton({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-left transition-[border-color,transform] hover:border-accent/45 active:scale-[0.99]"
    >
      <span className="flex-1">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-ink-3">{hint}</span>
      </span>
      <ArrowRightIcon
        size={16}
        weight="bold"
        className="shrink-0 text-ink-3 transition-colors group-hover:text-accent"
      />
    </button>
  );
}
