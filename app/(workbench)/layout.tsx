import { AppShell } from "@/components/app-shell";

export default function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
