import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  Trophy,
  ArrowUpRight,
  ShieldCheck,
  Mail,
  ArrowLeftRight,
  Settings,
  Lock,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { isDemo } from "../lib/supabase";
export function ChapterPage() {
  const { chapter, books, notify } = useApp();
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">ONE NEIGHBOURHOOD. SO MANY STORIES.</div>
          <h1>Welcome to {chapter?.name || "your chapter"}.</h1>
          <p>
            {chapter
              ? `${chapter.area}, ${chapter.city} · ${chapter.description}`
              : "Your local reading neighbourhood"}
          </p>
        </div>
        <button
          className="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${location.origin}/welcome`);
              notify(
                "Welcome link copied. Referral rewards will be enabled in a later phase.",
              );
            } catch {
              notify(
                "Share the welcome page link with your family and friends.",
              );
            }
          }}
        >
          <Users size={17} /> Invite a family
        </button>
      </div>
      <section className="community-hero">
        <div>
          <span className="eyebrow">EVERY BOOKSHELF BECOMES A LIBRARY</span>
          <h2>
            A small circle.
            <br />A world of possibilities.
          </h2>
          <p>
            We’re building a community where every child has a story to
            discover, and every family has something to share.
          </p>
          <Link className="button light" to="/explore">
            Explore our bookshelf <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="community-emblem">
          <BookOpen size={82} />
          <span>EST. 2026</span>
          <strong>{chapter?.name || "Your chapter"}</strong>
          <small>READ • SHARE • GROW</small>
        </div>
      </section>
      <div className="community-stats">
        {[
          {
            value: isDemo ? "50" : "—",
            label: "Reading families",
            icon: Users,
          },
          {
            value: books.length,
            label: "Stories on our shelves",
            icon: BookOpen,
          },
          {
            value: books.filter((b) => b.availability === "Available").length,
            label: "Ready for an adventure",
            icon: ArrowLeftRight,
          },
        ].map(({ icon: Icon, ...x }) => (
          <div className="panel" key={x.label}>
            <Icon size={24} />
            <strong>{x.value}</strong>
            <span>{x.label}</span>
          </div>
        ))}
      </div>
      <section className="panel community-challenge">
        <Trophy size={35} />
        <div>
          <span className="eyebrow">READING TOGETHER, GROWING TOGETHER</span>
          <h2>100 books. One happy chapter.</h2>
          <p>
            {isDemo
              ? "An illustrative monthly reading challenge for the founding chapter."
              : "Reading challenges will arrive with the community phase."}
          </p>
          {isDemo && (
            <>
              <div className="progress-track">
                <div style={{ width: "64%" }} />
              </div>
              <span className="progress-caption">
                64 of 100 books · demo progress
              </span>
            </>
          )}
        </div>
      </section>
      <div className="soft-note">
        <ShieldCheck size={22} />
        <p>
          Our chapter welcomes all readers. Personal contact details and exact
          home addresses are never public. Exchanges will be coordinated between
          member accounts.
        </p>
      </div>
      <section className="panel chapter-guidelines">
        <h2>A few little promises.</h2>
        <div>
          <p>
            <b>Share with care.</b> List books you would love to receive.
          </p>
          <p>
            <b>Keep the story going.</b> Return books on time and in good
            condition.
          </p>
          <p>
            <b>Share responsibly.</b> Coordinate exchanges respectfully and
            safely.
          </p>
        </div>
      </section>
    </>
  );
}
export function RequestsPage() {
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">FROM ONE READER TO ANOTHER</div>
          <h1>Your book exchanges.</h1>
          <p>Every handover begins a new adventure.</p>
        </div>
      </div>
      <div className="empty-state panel">
        <ArrowLeftRight size={44} />
        <h2>The next chapter is on its way.</h2>
        <p>
          Secure borrow requests, lending approvals and member-confirmed OTP
          exchanges are scheduled for the borrowing phase. No requests are being
          sent in this core UI build.
        </p>
        <Link className="button" to="/explore">
          Find a story to look forward to <ArrowUpRight size={17} />
        </Link>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { user, notify } = useApp();
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">A SAFE PLACE FOR LITTLE READERS</div>
          <h1>Privacy & settings.</h1>
          <p>Your account, your reading world.</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <Lock size={27} />
        <h2>Your privacy comes first.</h2>
        <p>
          Only a family display name, chapter and friendly trust badge appear
          publicly. Email addresses, dates of birth and home addresses stay
          private.
        </p>
        <div className="soft-note">
          <Users />
          <p>
            Child reading profiles and notification preferences are planned for
            the community phase. This version doesn’t collect child information.
          </p>
        </div>
        <h3>Member account</h3>
        <p>{user?.email || "You are viewing a demo family."}</p>
        <Link className="button secondary" to="/auth">
          <Mail size={16} /> Manage sign-in or reset password
        </Link>
        <button
          className="button secondary"
          onClick={() =>
            notify(
              "Contact chapter support to request account data export or deletion. A self-service account control is planned before public launch.",
            )
          }
        >
          <Settings size={16} /> Account data help
        </button>
        <p className="safety-note">
          <ShieldCheck size={16} />
          Camera access is used only when you choose to photograph a book.
          Photos are read on your device.
        </p>
      </section>
    </>
  );
}
