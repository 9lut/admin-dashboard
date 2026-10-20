import { cookies } from "next/headers";
import { AppShell, SIDEBAR_COOKIE } from "@/app/components/shell/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";
  return <AppShell initialCollapsed={collapsed}>{children}</AppShell>;
}
