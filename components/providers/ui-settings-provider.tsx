"use client";

/**
 * UiSettingsProvider — lightweight, client-side UI preferences shared across
 * the dashboard shell. Currently holds just the notification-icon visibility
 * (whether the bell shows in the header). Persisted to localStorage so the
 * choice survives refreshes and new sessions on this browser.
 *
 * Kept separate from server-backed config (platforms) on purpose: this is a
 * per-browser display preference, not global state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const NOTIFICATION_ICON_KEY = "ui:notification-icon";

// Content zoom — scales ONLY the main content area (not the shell/viewport).
const ZOOM_KEY = "ui:content-zoom";
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 10) / 10));

interface UiSettingsValue {
  /** Whether the notification bell is shown in the header. */
  notificationIconEnabled: boolean;
  /** Persist + apply a new visibility value (called on Save changes). */
  setNotificationIconEnabled: (value: boolean) => void;
  /** Zoom factor (1 = 100%) applied to the main content area only. */
  contentZoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const UiSettingsContext = createContext<UiSettingsValue | null>(null);

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [notificationIconEnabled, setEnabled] = useState(false);

  // Restore the persisted preference once on the client.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_ICON_KEY);
      if (stored === "1") setEnabled(true);
      else if (stored === "0") setEnabled(false);
    } catch {
      // localStorage may be unavailable — keep the default (off).
    }
  }, []);

  const setNotificationIconEnabled = useCallback((value: boolean) => {
    setEnabled(value);
    try {
      localStorage.setItem(NOTIFICATION_ICON_KEY, value ? "1" : "0");
    } catch {
      // ignore persistence failures
    }
  }, []);

  // ── Content zoom ──────────────────────────────────────────────────────────
  const [contentZoom, setContentZoom] = useState(1);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ZOOM_KEY);
      if (stored) setContentZoom(clampZoom(Number(stored) || 1));
    } catch {
      // keep default 100%
    }
  }, []);
  const bumpZoom = useCallback((delta: number) => {
    setContentZoom((z) => {
      const next = clampZoom(z + delta);
      try {
        localStorage.setItem(ZOOM_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  const zoomIn = useCallback(() => bumpZoom(ZOOM_STEP), [bumpZoom]);
  const zoomOut = useCallback(() => bumpZoom(-ZOOM_STEP), [bumpZoom]);

  const value = useMemo<UiSettingsValue>(
    () => ({
      notificationIconEnabled,
      setNotificationIconEnabled,
      contentZoom,
      zoomIn,
      zoomOut,
      canZoomIn: contentZoom < ZOOM_MAX,
      canZoomOut: contentZoom > ZOOM_MIN,
    }),
    [notificationIconEnabled, setNotificationIconEnabled, contentZoom, zoomIn, zoomOut]
  );

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>;
}

export function useUiSettings(): UiSettingsValue {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) {
    throw new Error("useUiSettings must be used within a UiSettingsProvider");
  }
  return ctx;
}
