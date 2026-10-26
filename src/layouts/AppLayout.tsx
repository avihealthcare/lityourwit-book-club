import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, Navigate, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  BookOpen,
  Plus,
  ArrowLeftRight,
  Users,
  Wallet,
  Bell,
  ChevronDown,
  ArrowUpRight,
  Heart,
  X,
  Download,
  LogOut,
  Menu,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { useApp } from "../hooks/useApp";
import { isDemo, supabase } from "../lib/supabase";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore books", icon: Compass },
  { to: "/my-books", label: "My bookshelf", icon: BookOpen },
  { to: "/requests", label: "Book exchanges", icon: ArrowLeftRight },
  { to: "/chapter", label: "My chapter", icon: Users },
  { to: "/wallet", label: "BookCoin wallet", icon: Wallet },
];
export function AppLayout() {
  const { balance, toast, loading, error, refresh, profile, user, notify } =
    useApp();
  const [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState(false),
    [install, setInstall] = useState<InstallEvent | null>(null);
  const navigate = useNavigate();
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  if (!isDemo && !loading && !user && !error)
    return <Navigate to="/welcome" replace />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        id="main-sidebar"
        className={`sidebar ${mobile ? "is-open" : ""}`}
        inert={narrow && !mobile}
        aria-hidden={narrow && !mobile}
      >
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="chapter-label">YOUR LITTLE READING WORLD</div>
        <Link to="/chapter" className="sidebar-chapter">
          <span className="chapter-icon">
            <Users size={19} />
          </span>
          <span>
            <strong>Viha’s Chapter</strong>
            <small>Powai, Mumbai</small>
          </span>
          <ChevronDown size={15} />
        </Link>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {to === "/requests" && <span className="nav-dot" />}
            </NavLink>
          ))}
        </nav>
        <Link to="/add-book" className="button add-sidebar">
          <Plus size={18} /> Share a book
        </Link>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span>
              Little books.
              <br />
              Big possibilities.
            </span>
            <Heart size={22} />
            <p>
              A neighbourhood of stories,
              <br />a community of readers.
            </p>
          </div>
          {install && (
            <button
              className="install-link"
              onClick={async () => {
                await install.prompt();
                await install.userChoice;
                setInstall(null);
              }}
            >
              <Download size={16} /> Install the app
            </button>
          )}
          <Link to="/profile" className="sidebar-profile">
            <span className="avatar">
              {profile?.display_name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2) || "P"}
            </span>
            <span>
              <strong>{profile?.display_name || "Your family"}</strong>
              <small>{isDemo ? "Demo family" : "Parent account"}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      {mobile && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button hamburger"
              aria-label="Open navigation"
              aria-expanded={mobile}
              aria-controls="main-sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span className="desktop-eyebrow">
              A LITTLE SHARING. A LOT OF STORIES.
            </span>
            <Brand />
          </div>
          <div className="topbar-actions">
            {isDemo && <span className="demo-label">Demo preview</span>}
            <Link className="wallet-pill" to="/wallet">
              <span>✦</span>
              <b>{balance}</b>
              <span className="coin-label">BookCoins</span>
            </Link>
            <button
              className="icon-button notification-button"
              onClick={() => setNotice(!notice)}
              aria-label="Notifications"
              aria-expanded={notice}
            >
              <Bell size={20} />
            </button>
            <Link
              to="/profile"
              className="avatar small"
              aria-label="Your profile"
            >
              {profile?.display_name[0] || "P"}
            </Link>
          </div>
          {notice && (
            <div className="notification-panel">
              <div className="section-heading">
                <h3>Notifications</h3>
                <button
                  aria-label="Close notifications"
                  className="icon-button"
                  onClick={() => setNotice(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <ShieldCheck size={25} />
              <h4>You’re all caught up</h4>
              <p>
                {isDemo
                  ? "This is a demo of your reading neighbourhood."
                  : "Request updates and reading reminders will appear here when exchanges are enabled."}
              </p>
            </div>
          )}
        </header>
        <main id="main-content" className="main-content">
          {!isDemo && !user && !loading ? (
            <div className="connection-banner">
              Sign in to see your chapter’s library.{" "}
              <Link to="/auth">
                Sign in <ArrowUpRight size={13} />
              </Link>
            </div>
          ) : null}
          {error ? (
            <div className="error-banner" role="alert">
              <strong>We couldn’t connect to your chapter.</strong>
              <p>{error}</p>
              <button
                className="button secondary"
                onClick={() => void refresh()}
              >
                Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className="loading-state" role="status">
              <BookOpen className="loading-icon" />
              <p>Opening your little library…</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="desktop-footer">
          <span>Every bookshelf becomes a library.</span>
          <span>
            <ShieldCheck size={13} /> Parent-led. Neighbourhood-loved.
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <NavLink to="/" end>
          <Home />
          <span>Home</span>
        </NavLink>
        <NavLink to="/explore">
          <Compass />
          <span>Explore</span>
        </NavLink>
        <NavLink to="/add-book" className="bottom-add">
          <span>
            <Plus />
          </span>
          <small>Add book</small>
        </NavLink>
        <NavLink to="/requests">
          <ArrowLeftRight />
          <span>Exchanges</span>
        </NavLink>
        <NavLink to="/profile">
          <Users />
          <span>Profile</span>
        </NavLink>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => notify("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <button
        className="floating-search"
        aria-label="Search books"
        onClick={() => navigate("/explore")}
      >
        <Search />
      </button>
      {user && (
        <button
          className="sr-only"
          onClick={() => void supabase?.auth.signOut()}
        >
          <LogOut />
          Sign out
        </button>
      )}
    </div>
  );
}
