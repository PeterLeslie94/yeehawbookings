import CustomerLayout from '@/app/components/layouts/CustomerLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}