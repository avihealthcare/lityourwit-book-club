import { useState } from "react";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { useApp } from "../hooks/useApp";
import { isDemo } from "../lib/supabase";
export function MembershipPage() {
  const { plans, notify } = useApp();
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">MAKE ROOM FOR MORE STORIES</div>
          <h1>A membership for every little reader.</h1>
          <p>A year of curiosity, community and books worth sharing.</p>
        </div>
      </div>
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
        {plans.map((plan, i) => (
          <section
            className={`panel plan-card ${i ? "featured" : ""}`}
            key={plan.id}
          >
            {i > 0 && <span className="plan-tag">A LITTLE MORE WONDER</span>}
            <Crown size={27} />
            <h2>{plan.name}</h2>
            <p>
              {i
                ? "For families with bigger reading appetites."
                : "A lovely place to start a reading habit."}
            </p>
            <div className="plan-price">
              ₹{annual ? plan.annual_price : plan.monthly_price}
              <span>/{annual ? "year" : "month"}</span>
            </div>
            <ul>
              {[
                annual
                  ? `${plan.signup_coins} welcome BookCoins`
                  : "Monthly access to your chapter",
                `Borrow up to ${plan.borrow_limit} books at once`,
                `${plan.borrow_days} days with every story`,
                `One ${plan.extension_days}-day extension if unreserved`,
                `${plan.child_limit} child ${plan.child_limit === 1 ? "profile" : "profiles"}`,
                `Book protection · up to ₹${plan.protection_limit}`,
                i
                  ? "Priority reservations"
                  : "Your chapter’s growing catalogue",
              ].map((x) => (
                <li key={x}>
                  <Check size={17} />
                  {x}
                </li>
              ))}
            </ul>
            <button
              className={`button ${i ? "" : "secondary"}`}
              onClick={() =>
                notify(
                  "Membership checkout is not enabled yet. No payment was taken and no membership was activated.",
                )
              }
            >
              Preview {plan.name}
            </button>
          </section>
        ))}
      </div>
      {!plans.length && (
        <div className="empty-state">
          <h2>Plans will appear after sign-in.</h2>
          <p>Connect to your chapter to view membership options.</p>
        </div>
      )}
      <p className="safety-note centered">
        <ShieldCheck size={17} />
        {isDemo
          ? "Demo plan configuration matches the launch brief."
          : "Plan details are loaded from your chapter’s database."}{" "}
        Checkout is not yet enabled.
      </p>
    </>
  );
}
