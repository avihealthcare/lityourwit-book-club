import { Modal } from "../components/Modal";
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Gift,
  BookOpen,
  Repeat2,
  X,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { isDemo } from "../lib/supabase";
import { UpiPaymentForm, type UpiChoice } from "../components/UpiPaymentForm";
import { PaymentHistory } from "../components/PaymentHistory";
import { Link } from "react-router-dom";
export function WalletPage() {
  const { balance, ledger, economy, finance } = useApp();
  const [packs, setPacks] = useState(false);
  const [choice, setChoice] = useState<UpiChoice | null>(null);
  const pending = finance.requests.some(
    (r) => r.kind === "coin_pack" && r.status === "pending",
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">GOOD STORIES COME FULL CIRCLE</div>
          <h1>A little sharing goes a long way.</h1>
          <p>Your BookCoins turn shared stories into new adventures.</p>
        </div>
      </div>
      <div className="wallet-layout">
        <section className="wallet-card">
          <span className="eyebrow">YOUR BOOKCOIN WALLET</span>
          <div className="wallet-balance">
            <span>✦</span> {balance}
            <small>BookCoins</small>
          </div>
          <p>
            {isDemo
              ? "Illustrative demo balance · no real transactions"
              : "Your next great read starts here."}
          </p>
          <div>
            <button
              className="button light"
              disabled={!finance.active || pending}
              onClick={() => setPacks(true)}
            >
              Get BookCoins <ArrowUpRight size={17} />
            </button>
            <Link to="/add-book" className="text-link">
              Share a book <ArrowUpRight size={16} />
            </Link>
          </div>
          {!finance.active && (
            <p>
              <Link to="/membership">Register for membership</Link> to unlock
              UPI BookCoin purchases after approval.
            </p>
          )}
          {pending && <p>Your coin purchase is awaiting admin approval.</p>}
          <span className="wallet-decoration">✦</span>
        </section>
        <section className="panel wallet-note">
          <ShieldCheck size={26} />
          <h3>Small coins. Big possibilities.</h3>
          <p>
            Borrowing a standard book uses {economy.borrow ?? "—"} BookCoins.
            Upload rewards are credited automatically. Membership and UPI
            purchase credits are added after admin payment verification.
          </p>
          <span className="safe-badge">Made for sharing, built on trust</span>
        </section>
      </div>
      <section className="shelf">
        <div className="section-heading">
          <div>
            <h2>Keep the stories flowing</h2>
            <p>A few ways your family can earn a little more.</p>
          </div>
          <Sparkles size={24} />
        </div>
        <div className="earn-grid">
          {[
            {
              icon: BookOpen,
              title: "Share your bookshelf",
              text: `+${economy.listing ?? "—"} for a book upload · up to ${economy.listing_annual_cap ?? "—"} per 365 days`,
              href: "/add-book",
            },
            {
              icon: Repeat2,
              title: "Let a story travel",
              text: `Planned: +${economy.borrow ?? "—"} when your book is borrowed · +${economy.return_bonus ?? "—"} on successful return`,
              href: "/my-books",
            },
            {
              icon: Gift,
              title: "Grow your reading circle",
              text: `Planned: +${economy.referral ?? "—"} after a paid referral completes their first borrow`,
              href: "/chapter",
            },
          ].map(({ icon: Icon, ...item }) => (
            <Link className="panel earn-card" key={item.title} to={item.href}>
              <Icon size={25} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="panel ledger-panel">
        <div className="section-heading">
          <div>
            <h2>Your little trail of stories</h2>
            <p>BookCoin activity {isDemo ? "· sample transactions" : ""}</p>
          </div>
          <span className="safe-badge">Read-only ledger</span>
        </div>
        {ledger.length ? (
          ledger.map((item) => (
            <div className="ledger-row" key={item.id}>
              <span className={`ledger-icon ${item.amount < 0 ? "spent" : ""}`}>
                {item.amount < 0 ? (
                  <ArrowUpRight size={21} />
                ) : (
                  <ArrowDownLeft size={21} />
                )}
              </span>
              <div>
                <strong>
                  {item.transaction_type
                    .replaceAll("_", " ")
                    .replace(/^./, (s) => s.toUpperCase())}
                </strong>
                <p>{item.notes}</p>
                <small>
                  {new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · Balance {item.balance_before} → {item.balance_after}
                </small>
              </div>
              <b className={item.amount < 0 ? "spent-text" : ""}>
                {item.amount > 0 ? "+" : ""}
                {item.amount} <span>✦</span>
              </b>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <BookOpen />
            <h3>A new story starts here.</h3>
            <p>Your verified transactions will appear here.</p>
          </div>
        )}
      </section>
      <PaymentHistory
        requests={finance.requests.filter((r) => r.kind === "coin_pack")}
      />
      {packs && (
        <Modal
          titleId="pack-title"
          onClose={() => {
            setPacks(false);
            setChoice(null);
          }}
        >
          <button
            className="icon-button modal-close"
            aria-label="Close BookCoin purchase"
            onClick={() => {
              setPacks(false);
              setChoice(null);
            }}
          >
            <X />
          </button>
          <h2 id="pack-title">Get BookCoins with UPI</h2>
          {choice ? (
            <UpiPaymentForm
              choice={choice}
              onDone={() => {
                setPacks(false);
                setChoice(null);
              }}
            />
          ) : (
            <>
              <p>
                Choose a pack and pay by UPI. Coins are added after admin
                approval.
              </p>
              <div className="pack-list">
                {finance.packs.map((pack) => (
                  <button
                    key={pack.coins}
                    className="pack"
                    onClick={() =>
                      setChoice({
                        kind: "coin_pack",
                        title: `${pack.coins} BookCoins`,
                        amount: pack.price,
                        coins: pack.coins,
                      })
                    }
                  >
                    <span>
                      <b>✦ {pack.coins}</b> BookCoins
                    </span>
                    <strong>₹{pack.price}</strong>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
