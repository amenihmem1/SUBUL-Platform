import { redirect } from 'next/navigation';

type DashboardSlugRedirectPageProps = {
  params: Promise<{ slug: string[] }>;
};

export default async function DashboardSlugRedirectPage({ params }: DashboardSlugRedirectPageProps) {
  const { slug } = await params;
  const path = Array.isArray(slug) ? slug.join('/') : '';
  redirect(`/fr/dashboard/${path}`);
}
