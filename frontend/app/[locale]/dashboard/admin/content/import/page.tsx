'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminContentImportHubPage() {
  const params = useParams();
  const locale = String(params.locale ?? 'fr');
  const links = [
    { href: 'courses', title: 'Courses Import', desc: 'Validate/preview/import nested certif_courses JSON' },
    { href: 'labs', title: 'Labs Import', desc: 'Import interactive labs JSON' },
    { href: 'certifications', title: 'Certifications Import', desc: 'Import nested or flat certifications JSON' },
    { href: 'content/practice-exams', title: 'Practice Exams', desc: 'Create/edit/import practice exams and questions' },
    { href: 'content/certification-paths', title: 'Certification Paths', desc: 'Import certification paths with practice exam steps' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Import Hub</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={`/${locale}/dashboard/admin/${item.href}`}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
