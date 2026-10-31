import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Users,
  MapPin,
  BookOpen,
  Settings,
  History,
  CreditCard,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  loadAdmin,
  manage,
  inviteMember,
  type AdminSnapshot,
  type Chapter,
  type Member,
} from "../services/admin";
import { reviewUpiPayment } from "../services/payments";
import type { Plan } from "../types";
import { useApp } from "../hooks/useApp";
const newChapter: Chapter = {
  id: "",
  name: "",
  area: "",
  city: "",
  pin_code: "",
  description: "",
  active: true,
};
const sections = [
  ["overview", "Overview", ShieldCheck],
  ["chapters", "Chapters", MapPin],
  ["members", "Members", Users],
  ["books", "Book approvals", BookOpen],
  ["payments", "Payments & memberships", CreditCard],
  ["plans", "Membership plans", CreditCard],
  ["settings", "Business settings", Settings],
  ["activity", "Activity log", History],
] as const;
export function AdminPage() {
  const { user } = useApp();
  const [data, setData] = useState<AdminSnapshot | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("overview"),
    [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<Chapter | null>(null),
    [member, setMember] = useState<Member | null>(null),
    [plan, setPlan] = useState<Plan | null>(null),
    [invite, setInvite] = useState(false),
    [email, setEmail] = useState(""),
    [name, setName] = useState("");
  const [setting, setSetting] = useState<{
    key: string;
    value: Record<string, number>;
  } | null>(null);
  const refresh = useCallback(async () => {
    try {
      setData(await loadAdmin());
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the admin panel.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const editorOpen = Boolean(chapter || member || plan || setting || invite);
  useEffect(() => {
    if (editorOpen)
      document
        .querySelector(".admin-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editorOpen]);

  async function run(task: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await refresh();
      setMessage(success);
      setChapter(null);
      setMember(null);
      setPlan(null);
      setSetting(null);
      setInvite(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function save(e: FormEvent, action: string, value: object) {
    e.preventDefault();
    void run(() => manage(action, value), "Changes saved.");
  }
  const chapterName = (id: string) =>
    data?.chapters.find((c) => c.id === id)?.name || "Chapter unavailable";
  const filteredMembers =
    data?.members.filter((m) =>
      `${m.display_name} ${m.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  if (loading) return <p role="status">Checking administrator access…</p>;
  if (!data)
    return (
      <div className="panel admin-denied">
        <ShieldCheck size={36} />
        <h1>Administrator access</h1>
        <p role="alert">{error}</p>
        <Link className="button" to="/">
          Return to your bookshelf
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">LITYOURWIT BUSINESS DESK</div>
          <h1>Your club, thoughtfully managed.</h1>
          <p>Chapters, families and stories in one place.</p>
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <nav className="admin-tabs" aria-label="Administration">
        {sections.map(([id, label, Icon]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              setQuery("");
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-note" role="status">
          {message}
        </p>
      )}
      <fieldset className="admin-controls" disabled={busy}>
        {tab === "overview" && (
          <>
            <div className="admin-stats">
              {[
                [
                  data.chapters.filter((c) => c.active).length,
                  "Active chapters",
                ],
                [data.members.filter((m) => !m.removed_at).length, "Members"],
                [
                  data.members.filter(
                    (m) => m.status === "pending" && !m.removed_at,
                  ).length,
                  "Awaiting membership approval",
                ],
                [
                  data.payments.filter((p) => p.status === "pending").length,
                  "Payments awaiting review",
                ],
                [
                  data.books.filter((b) => b.availability === "Pending").length,
                  "Books to review",
                ],
              ].map(([value, label]) => (
                <div className="panel" key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Keep your reading community growing.</h2>
              <p>
                Add neighbourhood chapters, invite families and approve their
                books. Every change is recorded in your activity log.
              </p>
              <div className="admin-actions">
                <button
                  className="button"
                  onClick={() => {
                    setTab("chapters");
                    setChapter(newChapter);
                  }}
                >
                  <Plus size={16} /> Add chapter
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setTab("members");
                    setInvite(true);
                  }}
                >
                  Add member
                </button>
              </div>
            </div>
          </>
        )}
        {tab === "chapters" && (
          <section className="panel">
            <div className="section-heading">
              <h2>Chapters</h2>
              <button
                className="button"
                onClick={() => setChapter({ ...newChapter })}
              >
                <Plus size={16} /> Add chapter
              </button>
            </div>
            <div className="admin-list">
              {data.chapters.map((c) => (
                <article className="admin-row" key={c.id}>
                  <div>
                    <h3>{c.name}</h3>
                    <p>
                      {c.area}, {c.city} {c.pin_code}
                    </p>
                    <span className="admin-status">
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setChapter({ ...c })}
                  >
                    Edit chapter
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        {tab === "members" && (
          <section className="panel">
            <div className="section-heading">
              <h2>Members</h2>
              <button className="button" onClick={() => setInvite(true)}>
                <Plus size={16} /> Add member
              </button>
            </div>
            <label>
              Find a member
              <input
                type="search"
                placeholder="Name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="admin-list">
              {filteredMembers.map((m) => (
                <article className="admin-row" key={m.id}>
                  <div>
                    <h3>
                      {m.display_name}{" "}
                      {m.role === "admin" && <small>· Administrator</small>}
                    </h3>
                    <p>{m.email}</p>
                    <p>{chapterName(m.chapter_id)}</p>
                    <span className="admin-status">
                      {m.removed_at
                        ? "Removed"
                        : m.suspended
                          ? "Suspended"
                          : m.status}
                    </span>
                  </div>
                  <div className="admin-actions">
                    {m.id !== user?.id &&
                      m.role !== "admin" &&
                      (m.removed_at ? (
                        <button
                          className="button secondary"
                          onClick={() =>
                            void run(
                              () => manage("member_restore", { id: m.id }),
                              "Member restored. Review their chapter approval and books.",
                            )
                          }
                        >
                          Restore member
                        </button>
                      ) : (
                        <>
                          <button
                            className="button secondary"
                            onClick={() => setMember({ ...m })}
                          >
                            Manage
                          </button>
                          <button
                            className="button danger"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${m.display_name} from the club? Access and listings will be suspended. You can restore this member later.`,
                                )
                              )
                                void run(
                                  () => manage("member_remove", { id: m.id }),
                                  "Member removed. Their history is preserved.",
                                );
                            }}
                          >
                            Remove
                          </button>
                        </>
                      ))}
                  </div>
                </article>
              ))}
              {!filteredMembers.length && <p>No members match your search.</p>}
            </div>
            <p className="safety-note">
              Invitations go to the member’s email so they can choose their own
              password. Removing a member preserves their records and can be
              reversed.
            </p>
          </section>
        )}
        {tab === "books" && (
          <section className="panel">
            <h2>Book approvals</h2>
            <label>
              Find a book
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title or author"
              />
            </label>
            <div className="admin-list">
              {data.books
                .filter((b) =>
                  `${b.title} ${b.author}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((b) => (
                  <article className="admin-row" key={b.id}>
                    <div>
                      <h3>{b.title}</h3>
                      <p>
                        {b.author} · {chapterName(b.chapter_id)}
                      </p>
                      <span className="admin-status">{b.availability}</span>
                    </div>
                    <div className="admin-actions">
                      {!["On Loan", "Reserved"].includes(b.availability) && (
                        <>
                          <button
                            className="button secondary"
                            disabled={b.availability === "Available"}
                            onClick={() =>
                              void run(
                                () =>
                                  manage("book_moderate", {
                                    id: b.id,
                                    availability: "Available",
                                  }),
                                "Book approved and available in its chapter.",
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="button secondary"
                            disabled={
                              b.availability === "Temporarily Unavailable"
                            }
                            onClick={() =>
                              void run(
                                () =>
                                  manage("book_moderate", {
                                    id: b.id,
                                    availability: "Temporarily Unavailable",
                                  }),
                                "Book hidden from the catalogue.",
                              )
                            }
                          >
                            Hide
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
            </div>
            {!data.books.length && <p>No books have been submitted yet.</p>}
          </section>
        )}
        {tab === "payments" && (
          <section className="panel">
            <h2>UPI payments & paid memberships</h2>
            <p>
              Check receipt in your UPI app or bank account before approving.
              Approval activates the paid membership and credits welcome
              BookCoins, or credits the purchased coin pack. Chapter approval
              alone does not activate paid membership.
            </p>
            <label>
              Show payments
              <select
                value={query || "pending"}
                onChange={(e) => setQuery(e.target.value)}
              >
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All payments</option>
              </select>
            </label>
            {data.payments
              .filter(
                (r) =>
                  (query || "pending") === "all" ||
                  r.status === (query || "pending"),
              )
              .map((r) => (
                <article className="admin-row payment-review" key={r.id}>
                  <div>
                    <h3>
                      {r.display_name} ·{" "}
                      {r.kind === "membership"
                        ? `${r.plan_name} ${r.billing_interval} membership`
                        : `${r.coins} BookCoins`}
                    </h3>
                    <p>
                      <strong>₹{r.amount}</strong> · {r.coins} BookCoins on
                      approval ·{" "}
                      {new Date(r.created_at).toLocaleString("en-IN")}
                    </p>
                    <p>Payer: {r.payer_name}</p>
                    <p className="payment-reference">
                      UPI transaction ID / UTR: <b>{r.transaction_reference}</b>
                    </p>
                    <span className={`payment-status ${r.status}`}>
                      {r.status}
                    </span>
                    {r.admin_notes && <p>Review note: {r.admin_notes}</p>}
                  </div>
                  {r.status === "pending" && (
                    <div className="admin-actions">
                      <button
                        className="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Confirm you independently verified receipt of ₹${r.amount} from ${r.payer_name}, UTR ${r.transaction_reference}. Approval will credit ${r.coins} BookCoins${r.kind === "membership" ? " and activate membership" : ""}.`,
                            )
                          )
                            void run(
                              () =>
                                reviewUpiPayment(
                                  r.id,
                                  true,
                                  "Payment verified by admin",
                                ),
                              "Payment approved. Membership and wallet credits have been updated.",
                            );
                        }}
                      >
                        Verify & approve
                      </button>
                      <button
                        className="button danger"
                        onClick={() => {
                          const reason = window.prompt(
                            "Reason for rejecting this payment (shown to the member):",
                          );
                          if (reason?.trim())
                            void run(
                              () =>
                                reviewUpiPayment(r.id, false, reason.trim()),
                              "Payment rejected. No coins were credited.",
                            );
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              ))}
            {!data.payments.some(
              (r) =>
                (query || "pending") === "all" ||
                r.status === (query || "pending"),
            ) && <p>No matching payment requests.</p>}
            <h3>Paid memberships</h3>
            {data.memberships.map((m) => (
              <article key={m.id} className="admin-row">
                <div>
                  <strong>
                    {data.members.find((member) => member.id === m.user_id)
                      ?.display_name || "Member"}
                  </strong>
                  <p>
                    {data.plans.find((p) => p.id === m.plan_id)?.name} ·{" "}
                    {m.billing_interval}
                  </p>
                </div>
                <p>
                  {m.status} · until{" "}
                  {new Date(m.ends_at).toLocaleDateString("en-IN")}
                </p>
              </article>
            ))}
          </section>
        )}
        {tab === "plans" && (
          <section className="panel">
            <h2>Membership plans</h2>
            <p>
              Manage prices and borrowing allowances. Saving a plan does not
              charge members or activate a paid subscription.
            </p>
            {data.plans.map((p) => (
              <article className="admin-row" key={p.id}>
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    ₹{p.annual_price}/year · ₹{p.monthly_price}/month ·{" "}
                    {p.borrow_limit} books · {p.borrow_days} days
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setPlan({ ...p })}
                >
                  Edit plan
                </button>
              </article>
            ))}
          </section>
        )}
        {tab === "settings" && (
          <section className="panel">
            <h2>Business settings</h2>
            <p>
              Manage BookCoin rewards, overdue reminders and sharing milestones.
              Existing wallet balances are preserved.
            </p>
            {data.configuration
              .filter((c) =>
                ["economy", "overdue", "milestones"].includes(c.key),
              )
              .map((c) => (
                <article className="admin-row" key={c.key}>
                  <div>
                    <h3>
                      {c.key === "economy"
                        ? "BookCoin rewards"
                        : c.key === "overdue"
                          ? "Overdue reminders"
                          : "Sharing milestones"}
                    </h3>
                    <p>{Object.keys(c.value).length} settings</p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      setSetting({
                        key: c.key,
                        value: { ...c.value } as Record<string, number>,
                      })
                    }
                  >
                    Edit settings
                  </button>
                </article>
              ))}
          </section>
        )}
        {tab === "activity" && (
          <section className="panel">
            <h2>Activity log</h2>
            <p>The latest 100 administrator actions.</p>
            {data.activity.map((a) => (
              <article className="admin-row" key={a.id}>
                <div>
                  <h3>{a.action.replaceAll("_", " ")}</h3>
                  <p>{a.target}</p>
                </div>
                <time>{new Date(a.created_at).toLocaleString()}</time>
              </article>
            ))}
            {!data.activity.length && (
              <p>Your first change will appear here.</p>
            )}
          </section>
        )}
      </fieldset>
      {(chapter || member || plan || setting || invite) && (
        <div
          className="admin-editor panel"
          role="region"
          aria-label="Edit business details"
        >
          <div className="section-heading">
            <h2>
              {chapter
                ? "Chapter details"
                : member
                  ? "Member details"
                  : plan
                    ? "Plan details"
                    : setting
                      ? "Business settings"
                      : "Add a member"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close editor"
              disabled={busy}
              onClick={() => {
                setChapter(null);
                setMember(null);
                setPlan(null);
                setSetting(null);
                setInvite(false);
              }}
            >
              <X />
            </button>
          </div>
          {chapter && (
            <form onSubmit={(e) => save(e, "chapter_save", chapter)}>
              <div className="form-grid">
                {(["name", "area", "city", "pin_code"] as const).map((k) => (
                  <label key={k}>
                    {k.replace("_", " ")}
                    <input
                      value={chapter[k] || ""}
                      required={k !== "pin_code"}
                      maxLength={k === "pin_code" ? 10 : 100}
                      onChange={(e) =>
                        setChapter({ ...chapter, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Description
                <textarea
                  maxLength={2000}
                  value={chapter.description}
                  onChange={(e) =>
                    setChapter({ ...chapter, description: e.target.value })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={chapter.active}
                  onChange={(e) =>
                    setChapter({ ...chapter, active: e.target.checked })
                  }
                />{" "}
                Active chapter
              </label>
              <button className="button" disabled={busy}>
                Save chapter
              </button>
            </form>
          )}
          {member && (
            <form onSubmit={(e) => save(e, "member_save", member)}>
              <label>
                Display name
                <input
                  required
                  maxLength={80}
                  value={member.display_name}
                  onChange={(e) =>
                    setMember({ ...member, display_name: e.target.value })
                  }
                />
              </label>
              <label>
                Primary chapter
                <select
                  value={member.chapter_id}
                  onChange={(e) =>
                    setMember({ ...member, chapter_id: e.target.value })
                  }
                >
                  {data.chapters
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Chapter approval
                <select
                  value={member.status}
                  onChange={(e) =>
                    setMember({ ...member, status: e.target.value })
                  }
                >
                  {["pending", "approved", "declined"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={member.suspended}
                  onChange={(e) =>
                    setMember({ ...member, suspended: e.target.checked })
                  }
                />{" "}
                Suspend access
              </label>
              <button className="button" disabled={busy}>
                Save member
              </button>
            </form>
          )}
          {plan && (
            <form onSubmit={(e) => save(e, "plan_save", plan)}>
              <label>
                Plan name
                <input
                  required
                  maxLength={80}
                  value={plan.name}
                  onChange={(e) => setPlan({ ...plan, name: e.target.value })}
                />
              </label>
              <div className="form-grid">
                {(
                  [
                    "annual_price",
                    "monthly_price",
                    "signup_coins",
                    "borrow_limit",
                    "borrow_days",
                    "extension_days",
                    "child_limit",
                    "protection_limit",
                  ] as const
                ).map((k) => (
                  <label key={k}>
                    {k.replaceAll("_", " ")}
                    <input
                      type="number"
                      required
                      min={
                        [
                          "borrow_limit",
                          "borrow_days",
                          "extension_days",
                          "child_limit",
                        ].includes(k)
                          ? 1
                          : 0
                      }
                      max={100000}
                      value={plan[k]}
                      onChange={(e) =>
                        setPlan({ ...plan, [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <button className="button" disabled={busy}>
                Save plan
              </button>
            </form>
          )}
          {setting && (
            <form onSubmit={(e) => save(e, "configuration_save", setting)}>
              <div className="form-grid">
                {Object.entries(setting.value).map(([key, value]) => (
                  <label key={key}>
                    {key.replaceAll("_", " ")}
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      required
                      value={value}
                      onChange={(e) =>
                        setSetting({
                          ...setting,
                          value: {
                            ...setting.value,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <button className="button" disabled={busy}>
                Save settings
              </button>
            </form>
          )}
          {invite && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  () => inviteMember(email, name),
                  "Invitation sent. The new member will appear in your member list.",
                );
              }}
            >
              <label>
                Member display name
                <input
                  value={name}
                  maxLength={80}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <p>
                An invitation will be emailed to this person. They choose their
                own password and start with pending chapter approval.
              </p>
              <button className="button" disabled={busy}>
                Send invitation
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
