import CustomerLayout from '@/app/components/layouts/CustomerLayout';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}