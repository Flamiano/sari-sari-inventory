// ─── Global Secure Session Store ─────────────────────────────────────────────
// Persists unlock state in sessionStorage so page refreshes and tab navigation
// don't force re-login. Session is cleared after 15 min of inactivity OR when
// the browser tab is closed OR on explicit sign-out / manual lock.
//
// sessionStorage is per-tab — opening a new tab always requires login again.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const STORAGE_KEY = "sari_secure_session";

interface StoredSession {
  expiresAt: number; // epoch ms
}

type Listener = () => void;

class SecureSessionStore {
  private _unlocked = false;
  private _expiresAt: number | null = null;
  private _inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private _listeners: Set<Listener> = new Set();
  private _hydrated = false;

  // ── Subscribe / notify ──────────────────────────────────────────────────
  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private notify() {
    this._listeners.forEach((fn) => fn());
  }

  // ── Hydrate from sessionStorage on first access ─────────────────────────
  // Must be called client-side only (after mount).
  hydrate() {
    if (this._hydrated || typeof window === "undefined") return;
    this._hydrated = true;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const stored: StoredSession = JSON.parse(raw);
      const now = Date.now();

      if (stored.expiresAt > now) {
        // Session still valid — restore it
        this._unlocked = true;
        this._expiresAt = stored.expiresAt;
        // Restart the timer for the remaining time
        this._startTimer(stored.expiresAt - now);
      } else {
        // Expired — clear it
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  // ── State getters ───────────────────────────────────────────────────────
  get isUnlocked() {
    return this._unlocked;
  }
  get expiresAt() {
    return this._expiresAt;
  }

  timeLeftMs(): number {
    if (!this._expiresAt) return 0;
    return Math.max(0, this._expiresAt - Date.now());
  }

  // ── Unlock ──────────────────────────────────────────────────────────────
  unlock() {
    this._unlocked = true;
    this._expiresAt = Date.now() + SESSION_DURATION_MS;
    this._persist();
    this._startTimer(SESSION_DURATION_MS);
    this.notify();
  }

  // ── Lock ────────────────────────────────────────────────────────────────
  lock() {
    this._unlocked = false;
    this._expiresAt = null;
    this._clearTimer();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.notify();
  }

  // ── Reset inactivity timer on user activity ─────────────────────────────
  resetActivity() {
    if (!this._unlocked) return;
    this._expiresAt = Date.now() + SESSION_DURATION_MS;
    this._persist();
    this._clearTimer();
    this._startTimer(SESSION_DURATION_MS);
    // No notify — just silently extend
  }

  // ── Internal helpers ────────────────────────────────────────────────────
  private _persist() {
    if (typeof window === "undefined") return;
    try {
      const data: StoredSession = { expiresAt: this._expiresAt! };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or unavailable */
    }
  }

  private _startTimer(ms: number) {
    this._clearTimer();
    this._inactivityTimer = setTimeout(() => {
      this.lock();
    }, ms);
  }

  private _clearTimer() {
    if (this._inactivityTimer) {
      clearTimeout(this._inactivityTimer);
      this._inactivityTimer = null;
    }
  }
}

// Singleton — shared across all components in the same browser tab
export const secureSession = new SecureSessionStore();
export const SESSION_DURATION_MS_EXPORT = SESSION_DURATION_MS;
