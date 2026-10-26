import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { AppProvider } from "./hooks/useApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppLayout } from "./layouts/AppLayout";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { BookDetailPage } from "./pages/BookDetailPage";
import { AddBookPage } from "./pages/AddBookPage";
import { MyBooksPage } from "./pages/MyBooksPage";
import { WalletPage } from "./pages/WalletPage";
import { ProfilePage } from "./pages/ProfilePage";
import {
  ChapterPage,
  RequestsPage,
  SettingsPage,
} from "./pages/CommunityPages";
import { MembershipPage } from "./pages/MembershipPage";
import { WelcomePage, AuthPage } from "./pages/AuthPage";
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
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
