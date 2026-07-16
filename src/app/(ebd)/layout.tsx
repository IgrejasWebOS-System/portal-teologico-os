import Sidebar from "@/components/layout/Sidebar";
import AutoLogout from "@/components/security/AutoLogout";
import { createClient } from "@/utils/supabase/server";
import { checkIsStaff } from "@/utils/staff";

export default async function EbdLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isStaff = user ? await checkIsStaff(supabase, user.id) : false;

  return (
    <div className="flex min-h-screen bg-iw-bg">
      <AutoLogout />
      <Sidebar isStaff={isStaff} />
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
