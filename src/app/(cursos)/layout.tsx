import Sidebar from "@/components/layout/Sidebar";
import AutoLogout from "@/components/security/AutoLogout";

export default function CursosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-iw-bg">
      <AutoLogout />
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
