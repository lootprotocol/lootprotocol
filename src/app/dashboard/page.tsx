'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ExtensionList } from '@/components/dashboard/extension-list';
import { VersionUpload } from '@/components/dashboard/version-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Download, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Extension } from '@lootprotocol/shared-types';

interface Stats {
  totalExtensions: number;
  totalDownloads: number;
  totalPublishers: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadExtension, setUploadExtension] = useState<Extension | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [extRes, statsRes] = await Promise.all([
          fetch(`/api/extensions?publisherId=${user!.id}`),
          fetch('/api/stats'),
        ]);

        if (extRes.ok) {
          const extData = await extRes.json();
          setExtensions(extData.data);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const totalDownloads = extensions.reduce((sum, ext) => sum + ext.downloadCount, 0);

  const handleUploadVersion = (extension: Extension) => {
    setUploadExtension(extension);
    setUploadOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="My Extensions"
          value={extensions.length}
          description="Published extensions"
          icon={<Package className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Downloads"
          value={totalDownloads.toLocaleString()}
          description="All time"
          icon={<Download className="h-4 w-4" />}
        />
        <StatsCard
          title="Marketplace Total"
          value={stats?.totalExtensions?.toLocaleString() ?? '—'}
          description={`${stats?.totalPublishers ?? 0} publishers`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">My Extensions</h2>
        <ExtensionList extensions={extensions} onUploadVersion={handleUploadVersion} />
      </div>

      <VersionUpload
        extension={uploadExtension}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
