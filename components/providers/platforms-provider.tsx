"use client";

/**
 * PlatformsProvider — one shared source of truth for which advertising
 * platforms are currently enabled across the whole dashboard.
 *
 * Wraps the (dashboard) layout so the sidebar nav, the Add Platform picker,
 * platform filters, the connect dialog and the settings page all read the same
 * globally-configured set and stay consistent. Enable/disable is available to
 * any signed-in user and persisted server-side (see actions/platform-actions.ts),
 * so changes survive refreshes and new sessions.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getEnabledPlatforms,
  setEnabledPlatforms as setEnabledPlatformsAction,
} from "@/server/actions/platform-actions";
import {
  PLATFORM_CATALOG,
  DEFAULT_ENABLED_PLATFORMS,
  getPlatforms,
  getAvailableToAdd,
  type PlatformDef,
} from "@/lib/platforms";

interface PlatformsContextValue {
  /** Enabled platform ids, in catalog order. */
  enabledIds: string[];
  /** Enabled platform definitions, in catalog order. */
  enabledPlatforms: PlatformDef[];
  /** Catalog platforms not currently enabled (candidates for "Add Platform"). */
  availablePlatforms: PlatformDef[];
  /** Full catalog. */
  catalog: PlatformDef[];
  /** Still loading the initial config. */
  loading: boolean;
  /** Replace the entire enabled set. Returns success. */
  setEnabled: (ids: string[]) => Promise<boolean>;
  /** Enable one platform. */
  enable: (id: string) => Promise<boolean>;
  /** Disable one platform. */
  disable: (id: string) => Promise<boolean>;
  /** Re-fetch from the server. */
  refresh: () => Promise<void>;
}

const PlatformsContext = createContext<PlatformsContextValue | null>(null);

export function PlatformsProvider({ children }: { children: React.ReactNode }) {
  const [enabledIds, setEnabledIds] = useState<string[]>(DEFAULT_ENABLED_PLATFORMS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getEnabledPlatforms();
      if (res.platforms) setEnabledIds(res.platforms);
    } catch {
      // keep whatever we have; defaults already applied
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persist a new set, with optimistic update + rollback on failure.
  const setEnabled = useCallback(
    async (ids: string[]) => {
      const previous = enabledIds;
      // Keep catalog order so the UI doesn't jump around.
      const ordered = PLATFORM_CATALOG.map((p) => p.id).filter((id) => ids.includes(id));
      setEnabledIds(ordered);
      const res = await setEnabledPlatformsAction(ordered);
      if (!res.success) {
        setEnabledIds(previous);
        return false;
      }
      if (res.platforms) setEnabledIds(res.platforms);
      return true;
    },
    [enabledIds]
  );

  const enable = useCallback(
    (id: string) => setEnabled(enabledIds.includes(id) ? enabledIds : [...enabledIds, id]),
    [enabledIds, setEnabled]
  );

  const disable = useCallback(
    (id: string) => setEnabled(enabledIds.filter((p) => p !== id)),
    [enabledIds, setEnabled]
  );

  const value = useMemo<PlatformsContextValue>(
    () => ({
      enabledIds,
      enabledPlatforms: getPlatforms(enabledIds),
      availablePlatforms: getAvailableToAdd(enabledIds),
      catalog: PLATFORM_CATALOG,
      loading,
      setEnabled,
      enable,
      disable,
      refresh,
    }),
    [enabledIds, loading, setEnabled, enable, disable, refresh]
  );

  return <PlatformsContext.Provider value={value}>{children}</PlatformsContext.Provider>;
}

export function usePlatforms(): PlatformsContextValue {
  const ctx = useContext(PlatformsContext);
  if (!ctx) {
    throw new Error("usePlatforms must be used within a PlatformsProvider");
  }
  return ctx;
}
