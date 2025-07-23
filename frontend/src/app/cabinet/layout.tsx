import UserLayout from '@/components/layout/UserLayout';

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserLayout>{children}</UserLayout>;
}