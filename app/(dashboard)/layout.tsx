import { AppShell } from "@/components/shell/app-shell";
import { PlatformsProvider } from "@/components/providers/platforms-provider";
import { UiSettingsProvider } from "@/components/providers/ui-settings-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UiSettingsProvider>
      <PlatformsProvider>
        <AppShell>{children}</AppShell>
      </PlatformsProvider>
    </UiSettingsProvider>
  );
}
