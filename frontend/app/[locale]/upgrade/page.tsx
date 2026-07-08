import { redirect } from 'next/navigation';

/** Upgrade marketing page removed — send users to the learner dashboard. */
export default async function UpgradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard/learner`);
}
