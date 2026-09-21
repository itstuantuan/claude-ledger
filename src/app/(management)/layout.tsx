import { AuthGuard } from "@/features/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
export default function ManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
