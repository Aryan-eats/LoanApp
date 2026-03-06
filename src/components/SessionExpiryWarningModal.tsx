import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  refreshSession,
  subscribeToSessionExpiryWarning,
  type SessionExpiryWarningState,
} from '../api/apiClient';
import { parseApiError } from '../utils/parseApiError';
import { useAuthStore } from '../stores/authStore';

const INITIAL_WARNING_STATE: SessionExpiryWarningState = {
  isVisible: false,
  expiresAt: null,
};

const formatRemainingTime = (remainingMs: number): string => {
  const safeRemainingMs = Math.max(remainingMs, 0);
  const totalSeconds = Math.ceil(safeRemainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${Math.max(seconds, 0)} second${seconds === 1 ? '' : 's'}`;
  }

  if (seconds === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${minutes}m ${seconds}s`;
};

const SessionExpiryWarningModal: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [warningState, setWarningState] = useState<SessionExpiryWarningState>(
    INITIAL_WARNING_STATE
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setWarningState(INITIAL_WARNING_STATE);
      setErrorMessage(null);
      setIsRefreshing(false);
      return;
    }

    return subscribeToSessionExpiryWarning((nextState) => {
      setWarningState(nextState);
      setCurrentTime(Date.now());

      if (!nextState.isVisible) {
        setErrorMessage(null);
        setIsRefreshing(false);
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!warningState.isVisible) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      actionButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      previousFocusRef.current?.focus();
    };
  }, [warningState.isVisible]);

  useEffect(() => {
    if (!warningState.isVisible || warningState.expiresAt === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextTime = Date.now();
      setCurrentTime(nextTime);

      if (nextTime >= warningState.expiresAt) {
        void logout();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [warningState.expiresAt, warningState.isVisible, logout]);

  const remainingMs = useMemo(() => {
    if (warningState.expiresAt === null) {
      return 0;
    }

    return Math.max(warningState.expiresAt - currentTime, 0);
  }, [currentTime, warningState.expiresAt]);

  const handleStaySignedIn = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      await refreshSession();
    } catch (error) {
      const message = parseApiError(
        error,
        'Unable to extend your session. Please sign in again.'
      );
      setErrorMessage(message);

      const status = error instanceof Error && 'status' in error
        ? (error as Error & { status?: number }).status
        : undefined;

      if (status === 401) {
        await logout();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    await logout();
  };

  if (!isAuthenticated || !warningState.isVisible || warningState.expiresAt === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expiry-title"
        aria-describedby="session-expiry-description"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="session-expiry-title" className="text-lg font-semibold text-slate-900">
              Session expiring soon
            </h2>
            <p
              id="session-expiry-description"
              className="mt-1 text-sm leading-6 text-slate-600"
            >
              Your session will expire in {formatRemainingTime(remainingMs)}.
              Refresh it now to keep working without interruption.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Log out
          </button>
          <button
            ref={actionButtonRef}
            type="button"
            onClick={handleStaySignedIn}
            disabled={isRefreshing}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing...' : 'Stay signed in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiryWarningModal;
