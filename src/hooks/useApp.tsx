import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isDemo } from "../lib/supabase";
import {
  demoBooks,
  demoPlans,
  demoEconomy,
  demoLedger,
  DEMO_USER,
  CHAPTER_ID,
} from "../data/demo";
import { loadAccount, loadCatalogue, saveBook } from "../services/catalogue";
import type { Book, Plan, LedgerEntry, NewBook, FamilyProfile } from "../types";
import type { Chapter } from "../services/admin";
interface AppState {
  chapter: Pick<
    Chapter,
    "id" | "name" | "area" | "city" | "description" | "active"
  > | null;
  isAdmin: boolean;
  books: Book[];
  plans: Plan[];
  economy: Record<string, number>;
  balance: number;
  ledger: LedgerEntry[];
  user: User | null;
  profile: FamilyProfile | null;
  loading: boolean;
  error: string;
  toast: string;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  addBook: (book: NewBook) => Promise<void>;
  saved: string[];
  toggleSaved: (id: string) => void;
}
const Context = createContext<AppState | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>(isDemo ? demoBooks : []),
    [plans, setPlans] = useState<Plan[]>(isDemo ? demoPlans : []),
    [economy, setEconomy] = useState<Record<string, number>>(
      isDemo ? demoEconomy : {},
    ),
    [balance, setBalance] = useState(isDemo ? 75 : 0),
    [ledger, setLedger] = useState<LedgerEntry[]>(isDemo ? demoLedger : []),
    [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<FamilyProfile | null>(
      isDemo
        ? {
            id: DEMO_USER,
            display_name: "Priya Sharma",
            chapter_id: CHAPTER_ID,
            trust_level: "Trusted Reader",
          }
        : null,
    ),
    [loading, setLoading] = useState(!isDemo),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [saved, setSaved] = useState<string[]>([]);
  const [chapter, setChapter] = useState<AppState["chapter"]>(
    isDemo
      ? {
          id: CHAPTER_ID,
          name: "Viha’s Chapter",
          area: "Powai",
          city: "Mumbai",
          description: "Our founding reading neighbourhood",
          active: true,
        }
      : null,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const refreshGeneration = useRef(0);
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const generation = ++refreshGeneration.current;
    setLoading(true);
    setError("");
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      let current: User | null = null;
      if (session) {
        const result = await supabase.auth.getUser();
        if (result.error) throw result.error;
        current = result.data.user;
      }
      if (generation !== refreshGeneration.current) return;
      setUser(current);
      if (!current) {
        setBooks([]);
        setProfile(null);
        setIsAdmin(false);
        setChapter(null);
        setBalance(0);
        setLedger([]);
        setPlans([]);
        setEconomy({});
        setSaved([]);
        return;
      }
      const [catalogue, account] = await Promise.all([
        loadCatalogue(),
        loadAccount(current.id),
      ]);
      if (generation !== refreshGeneration.current) return;
      setBooks(catalogue);
      setProfile(account.profile);
      setIsAdmin(account.isAdmin);
      setChapter(account.chapter);
      setBalance(account.balance);
      setLedger(account.ledger);
      setPlans(account.plans);
      setEconomy(account.economy ?? {});
    } catch (e) {
      if (generation !== refreshGeneration.current) return;
      setBooks([]);
      setProfile(null);
      setIsAdmin(false);
      setChapter(null);
      setBalance(0);
      setLedger([]);
      setPlans([]);
      setEconomy({});
      setSaved([]);
      setError(
        e instanceof Error
          ? e.message
          : "Could not load your chapter. Please try again.",
      );
    } finally {
      if (generation === refreshGeneration.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    void refresh();
    return () => subscription.unsubscribe();
  }, [refresh]);
  const addBook = async (book: NewBook) => {
    if (isDemo) {
      setBooks((prev) => [
        {
          ...book,
          id: crypto.randomUUID(),
          owner_id: DEMO_USER,
          chapter_id: CHAPTER_ID,
          color: "#51766b",
          motif: "stars",
          shared: 0,
          availability: "Pending",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } else {
      await saveBook(book);
      await refresh();
    }
    notify("Book submitted for approval. Thank you for sharing!");
  };
  return (
    <Context.Provider
      value={{
        chapter,
        isAdmin,
        books,
        plans,
        economy,
        balance,
        ledger,
        user,
        profile,
        loading,
        error,
        toast,
        notify,
        refresh,
        addBook,
        saved,
        toggleSaved: (id) =>
          setSaved((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          ),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const state = useContext(Context);
  if (!state) throw new Error("AppProvider is missing");
  return state;
}
