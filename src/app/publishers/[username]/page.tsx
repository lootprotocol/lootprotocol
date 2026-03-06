import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Globe, Download } from 'lucide-react';
import type { Profile, Extension } from '@lootprotocol/shared-types';

interface PublisherData {
  profile: Profile;
  extensions: Extension[];
}

async function getPublisherData(username: string): Promise<PublisherData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/publishers/${username}`, {
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const { data } = await res.json();
  return data;
}

export default async function PublisherProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getPublisherData(username);

  if (!data) notFound();

  const { profile, extensions } = data;
  const initials = profile.username.slice(0, 2).toUpperCase();
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.username} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            {profile.displayName ?? profile.username}
          </h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-1 text-sm">{profile.bio}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {joinDate}
            </span>
            {profile.websiteUrl && (
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Extensions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">
          Extensions ({extensions.length})
        </h2>
        {extensions.length === 0 ? (
          <p className="text-muted-foreground">No extensions published yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {extensions.map((ext) => (
              <Card key={ext.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {ext.displayName ?? ext.name}
                    </CardTitle>
                    <Badge variant="secondary">{ext.extensionType.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground">{ext.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>v{ext.latestVersion}</span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {ext.downloadCount.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
