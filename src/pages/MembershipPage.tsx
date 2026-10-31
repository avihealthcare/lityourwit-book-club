import { useState } from "react";
import { Check, Crown, ShieldCheck, X } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { Modal } from "../components/Modal";
import { UpiPaymentForm, type UpiChoice } from "../components/UpiPaymentForm";
import { PaymentHistory } from "../components/PaymentHistory";
export function MembershipPage() {
  const { plans, finance } = useApp();
  const [annual, setAnnual] = useState(true),
    [choice, setChoice] = useState<UpiChoice | null>(null);
  const pending = finance.requests.some(
    (r) => r.kind === "membership" && r.status === "pending",
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">MAKE ROOM FOR MORE STORIES</div>
          <h1>Your next chapter starts here.</h1>
          <p>
            Choose a membership, pay by UPI and submit your transaction for
            admin approval.
          </p>
        </div>
      </div>
      {finance.active && finance.membership && (
        <section className="panel membership-status">
          <Crown />
          <h2>{finance.membership.plan_name} membership is active</h2>
          <p>
            Valid until{" "}
            {new Date(finance.membership.ends_at).toLocaleDateString("en-IN")}.
            Your welcome BookCoins have been credited after payment approval.
          </p>
        </section>
      )}
      {!finance.ready && (
        <p className="soft-note" role="status">
          Payment setup is updating. Membership registration will be available
          shortly.
        </p>
      )}
      {pending && (
        <p className="success-note" role="status">
          Your membership payment is awaiting admin review. Approval activates
          your membership and credits its welcome BookCoins.
        </p>
      )}
      <div className="billing-toggle">
        <button
          className={annual ? "active" : ""}
          onClick={() => setAnnual(true)}
        >
          Yearly
        </button>
        <button
          className={!annual ? "active" : ""}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
      </div>
      <div className="plan-grid">
        {plans.map((p, i) => (
          <section
            className={`panel plan-card ${i ? "featured" : ""}`}
            key={p.id}
          >
            {i > 0 && <span className="plan-tag">MORE ROOM TO READ</span>}
            <Crown size={27} />
            <h2>{p.name}</h2>
            <p>
              {i
                ? "For readers with bigger reading appetites."
                : "A lovely place to start a reading habit."}
            </p>
            <div className="plan-price">
              ₹{annual ? p.annual_price : p.monthly_price}
              <span>/{annual ? "year" : "month"}</span>
            </div>
            <ul>
              {[
                `${p.signup_coins} welcome BookCoins on approval`,
                `Borrow up to ${p.borrow_limit} books at once`,
                `${p.borrow_days} days with every story`,
                `One ${p.extension_days}-day extension if unreserved`,
                `Book protection up to ₹${p.protection_limit}`,
              ].map((text) => (
                <li key={text}>
                  <Check size={17} />
                  {text}
                </li>
              ))}
            </ul>
            <button
              className={`button ${i ? "" : "secondary"}`}
              disabled={!finance.ready || finance.active || pending}
              onClick={() =>
                setChoice({
                  kind: "membership",
                  title: `${p.name} · ${annual ? "Yearly" : "Monthly"}`,
                  amount: annual ? p.annual_price : p.monthly_price,
                  coins: p.signup_coins,
                  plan: p.id,
                  interval: annual ? "annual" : "monthly",
                })
              }
            >
              {finance.active
                ? "Membership active"
                : pending
                  ? "Awaiting approval"
                  : `Register for ${p.name}`}
            </button>
          </section>
        ))}
      </div>
      {!plans.length && (
        <div className="empty-state">
          <h2>Sign in to view membership plans.</h2>
        </div>
      )}
      <p className="safety-note centered">
        <ShieldCheck size={17} />
        Pay by UPI to {finance.upi_mobile}. Membership starts when the admin
        verifies and approves your payment.
      </p>
      <PaymentHistory
        requests={finance.requests.filter((r) => r.kind === "membership")}
      />
      {choice && (
        <Modal
          titleId="membership-payment-title"
          onClose={() => setChoice(null)}
        >
          <button
            className="icon-button modal-close"
            aria-label="Close payment form"
            onClick={() => setChoice(null)}
          >
            <X />
          </button>
          <h2 id="membership-payment-title">Register your membership</h2>
          <UpiPaymentForm choice={choice} onDone={() => setChoice(null)} />
        </Modal>
      )}
    </>
  );
}
