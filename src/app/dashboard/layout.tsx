import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
