import type { PaymentRequest } from "../services/payments";
export function PaymentHistory({ requests }: { requests: PaymentRequest[] }) {
  if (!requests.length) return null;
  return (
    <section className="panel payment-history">
      <h2>Your payment requests</h2>
      {requests.map((r) => (
        <article className="admin-row" key={r.id}>
          <div>
            <h3>
              {r.kind === "membership"
                ? `${r.plan_name} membership`
                : `${r.coins} BookCoins`}
            </h3>
            <p>
              ₹{r.amount} · {new Date(r.created_at).toLocaleDateString("en-IN")}{" "}
              · UTR {r.transaction_reference}
            </p>
            {r.admin_notes && <p>Admin note: {r.admin_notes}</p>}
          </div>
          <span className={`payment-status ${r.status}`}>
            {r.status === "pending" ? "Awaiting admin approval" : r.status}
          </span>
        </article>
      ))}
    </section>
  );
}
