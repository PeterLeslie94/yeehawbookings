import CustomerLayout from '@/app/components/layouts/CustomerLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}