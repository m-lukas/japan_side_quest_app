import { notFound } from 'next/navigation';
import { roleForToken } from '../../lib/auth';
import QuestApp from '../../components/QuestApp';

export const dynamic = 'force-dynamic';
export default async function TokenPage({ params }) {
  params = await params;
  const role = roleForToken(params.token);
  if (!role) notFound();
  return <QuestApp token={params.token} role={role} />;
}
