import SidebarShell from "@/components/layout/SidebarShell";
import AutoLogout from "@/components/security/AutoLogout";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isStaff = user ? await checkIsStaff(supabase, user.id) : false;

  return (
    <>
      <AutoLogout />
      <SidebarShell isStaff={isStaff}>{children}</SidebarShell>
    </>
  );
}
