import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Crown,
  Wallet,
  BookOpen,
  Bell,
  Lock,
  ChevronRight,
  LogOut,
  Heart,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import { isDemo, supabase } from "../lib/supabase";
export function ProfilePage() {
  const { chapter, isAdmin, profile, books, balance, notify, user } = useApp();
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">THE READER BEHIND THE BOOKSHELF</div>
          <h1>Your reading corner.</h1>
          <p>A little home for your reading adventures.</p>
        </div>
      </div>
      <section className="profile-card panel">
        <div className="profile-cover">
          <span>READ. SHARE. EARN. REPEAT.</span>
          <BookOpen size={45} />
        </div>
        <div className="profile-summary">
          <span className="avatar profile-avatar">
            {profile?.display_name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2) || "P"}
          </span>
          <div>
            <h2>{profile?.display_name || "Your account"}</h2>
            <p>
              {chapter
                ? `${chapter.name} · ${chapter.area}, ${chapter.city}`
                : "Your reading chapter"}
            </p>
            <span className="safe-badge">
              <ShieldCheck size={14} />
              {profile?.trust_level || "New Reader"}
            </span>
          </div>
          <Link className="button secondary" to="/membership">
            <Crown size={16} />
            {isDemo ? "Reader Plus · demo" : "View membership"}
          </Link>
        </div>
        <div className="profile-stats">
          <Link to="/wallet">
            <strong>{balance}</strong>
            <span>BookCoins</span>
          </Link>
          <Link to="/my-books">
            <strong>
              {books.filter((b) => b.owner_id === profile?.id).length}
            </strong>
            <span>Books on your shelf</span>
          </Link>
          <Link to="/explore?saved=1">
            <strong>
              <Heart size={24} />
            </strong>
            <span>Saved stories</span>
          </Link>
        </div>
      </section>
      {isAdmin && (
        <Link className="button" to="/admin">
          <ShieldCheck size={18} /> Open admin panel
        </Link>
      )}
      <div className="profile-links">
        {[
          {
            icon: Users,
            title: "My account",
            subtitle: "Your account and reading preferences",
            to: "/settings",
          },
          {
            icon: Crown,
            title: "Membership",
            subtitle: "Find your family’s next chapter",
            to: "/membership",
          },
          {
            icon: Wallet,
            title: "BookCoin wallet",
            subtitle: "Your balance and transaction history",
            to: "/wallet",
          },
          {
            icon: BookOpen,
            title: "My bookshelf",
            subtitle: "The stories you’re sharing with your chapter",
            to: "/my-books",
          },
          {
            icon: Bell,
            title: "Notifications",
            subtitle: "Reading reminders and chapter updates",
            to: "/settings",
          },
          {
            icon: Lock,
            title: "Privacy & settings",
            subtitle: "A safe little corner of the internet",
            to: "/settings",
          },
        ].map(({ icon: Icon, ...x }) => (
          <Link className="panel profile-link" key={x.title} to={x.to}>
            <span>
              <Icon size={23} />
            </span>
            <div>
              <strong>{x.title}</strong>
              <p>{x.subtitle}</p>
            </div>
            <ChevronRight size={18} />
          </Link>
        ))}
      </div>
      {user ? (
        <button
          className="button secondary"
          onClick={async () => {
            const result = await supabase?.auth.signOut();
            if (result?.error) notify(result.error.message);
            else notify("You’ve signed out safely.");
          }}
        >
          <LogOut size={17} />
          Sign out
        </button>
      ) : (
        <Link to="/auth" className="button">
          {isDemo ? "Explore sign-in" : "Sign in to your account"}
        </Link>
      )}
    </>
  );
}
