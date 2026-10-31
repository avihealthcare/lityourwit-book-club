import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AppProvider } from "./hooks/useApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
const HomePage = lazy(() =>
  import("./pages/HomePage").then((module) => ({ default: module.HomePage })),
);
const ExplorePage = lazy(() =>
  import("./pages/ExplorePage").then((module) => ({
    default: module.ExplorePage,
  })),
);
const BookDetailPage = lazy(() =>
  import("./pages/BookDetailPage").then((module) => ({
    default: module.BookDetailPage,
  })),
);
const AddBookPage = lazy(() =>
  import("./pages/AddBookPage").then((module) => ({
    default: module.AddBookPage,
  })),
);
const MyBooksPage = lazy(() =>
  import("./pages/MyBooksPage").then((module) => ({
    default: module.MyBooksPage,
  })),
);
const WalletPage = lazy(() =>
  import("./pages/WalletPage").then((module) => ({
    default: module.WalletPage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  })),
);
const ChapterPage = lazy(() =>
  import("./pages/CommunityPages").then((module) => ({
    default: module.ChapterPage,
  })),
);
const RequestsPage = lazy(() =>
  import("./pages/CommunityPages").then((module) => ({
    default: module.RequestsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/CommunityPages").then((module) => ({
    default: module.SettingsPage,
  })),
);
const MembershipPage = lazy(() =>
  import("./pages/MembershipPage").then((module) => ({
    default: module.MembershipPage,
  })),
);
const WelcomePage = lazy(() =>
  import("./pages/AuthPage").then((module) => ({
    default: module.WelcomePage,
  })),
);
const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })),
);
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "LitYourWit · Every bookshelf becomes a library";
  }, [pathname]);
  return null;
}
export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ScrollToTop />
          <Suspense
            fallback={
              <p className="route-loading" role="status">
                Opening your page…
              </p>
            }
          >
            <Routes>
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<AppLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/add-book" element={<AddBookPage />} />
                <Route path="/my-books" element={<MyBooksPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chapter" element={<ChapterPage />} />
                <Route path="/membership" element={<MembershipPage />} />
                <Route path="/requests" element={<RequestsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h1>A little lost in the stacks?</h1>
                      <p>This page isn’t on our bookshelf.</p>
                      <Link className="button" to="/">
                        Find your way home
                      </Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
