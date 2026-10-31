import { useState, type FormEvent } from "react";
import { Copy, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { requestUpiPayment } from "../services/payments";
export interface UpiChoice {
  kind: "membership" | "coin_pack";
  title: string;
  amount: number;
  coins: number;
  plan?: string;
  interval?: "monthly" | "annual";
}
export function UpiPaymentForm({
  choice,
  onDone,
}: {
  choice: UpiChoice;
  onDone: () => void;
}) {
  const { finance, profile, refresh, notify } = useApp();
  const [payer, setPayer] = useState(profile?.display_name || ""),
    [reference, setReference] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await requestUpiPayment({ ...choice, payer, reference });
      setSubmitted(true);
      notify("Payment submitted for admin review.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit your payment.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (submitted)
    return (
      <section className="payment-success" role="status">
        <CheckCircle2 size={36} />
        <h3>Payment submitted for review</h3>
        <p>
          Your{" "}
          {choice.kind === "membership"
            ? "membership and welcome BookCoins"
            : "BookCoins"}{" "}
          will be updated after the admin verifies your UPI payment.
        </p>
        <button
          type="button"
          className="button"
          onClick={async () => {
            onDone();
            await refresh();
          }}
        >
          Done
        </button>
      </section>
    );
  return (
    <form className="upi-payment-form" onSubmit={submit}>
      <h3>{choice.title}</h3>
      <div className="upi-payee">
        <span>Pay using your UPI app</span>
        <strong>₹{choice.amount}</strong>
        <p>UPI mobile number</p>
        <b>{finance.upi_mobile}</b>
        <button
          type="button"
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(finance.upi_mobile);
              notify("UPI mobile number copied.");
            } catch {
              setError(
                "Please copy the displayed mobile number into your UPI app.",
              );
            }
          }}
        >
          <Copy size={16} /> Copy mobile number
        </button>
      </div>
      <p>
        Open your UPI app, choose payment to a mobile number, enter the number
        above and verify the recipient shown in your UPI app before paying. Then
        enter the completed transaction details below.
      </p>
      <label>
        Payer name
        <input
          required
          maxLength={80}
          autoComplete="name"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
        />
      </label>
      <label>
        UPI transaction ID / UTR
        <input
          required
          minLength={6}
          maxLength={64}
          autoComplete="off"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="From your completed UPI payment"
        />
      </label>
      <p className="safety-note">
        <ShieldCheck size={16} />
        Submitting these details does not confirm payment. The admin checks
        receipt before approving{" "}
        {choice.kind === "membership"
          ? `your membership and ${choice.coins} welcome BookCoins`
          : `${choice.coins} BookCoins`}
        .
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Submitting…" : "I've paid — submit for review"}
      </button>
    </form>
  );
}
