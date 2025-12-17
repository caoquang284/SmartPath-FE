'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgePill } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Medal, Target } from 'lucide-react';
import { badgeAPI } from '@/lib/api/badgeAPI';
import type { BadgeResponseDto } from '@/lib/types';

type BadgeWithStatus = {
  id: string;
  name: string;
  point: number;
  description?: string | null;
  earned: boolean;
};

export default function AchievementsPage() {
  const { profile } = useAuth();

  const [badgesApi, setBadgesApi] = useState<BadgeResponseDto[]>([]);
  const [loadingBadges, setLoadingBadges] = useState<boolean>(true);
  const [errorBadges, setErrorBadges] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingBadges(true);
        const data = await badgeAPI.getAll();
        if (!mounted) return;
        setBadgesApi([...data].sort((a, b) => a.point - b.point));
        setErrorBadges(null);
      } catch (err: any) {
        if (!mounted) return;
        setErrorBadges(err?.message ?? 'Failed to load badges');
      } finally {
        if (mounted) setLoadingBadges(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Tổng điểm danh tiếng (theo bạn đang dùng profile.point)
  const totalReputation = profile?.point ?? 0;

  // Map từ BadgeResponseDto -> BadgeWithStatus (earned dựa vào điểm user)
  const badgesWithStatus: BadgeWithStatus[] = useMemo(() => {
    return badgesApi.map((b) => ({
      id: b.id,
      name: b.name,
      point: b.point,
      description: null, // backend chưa có description
      earned: totalReputation >= b.point,
    }));
  }, [badgesApi, totalReputation]);

  // Thống kê
  const earnedCount = badgesWithStatus.filter((badge) => badge.earned).length;
  const nextBadge = badgesWithStatus.find((badge) => !badge.earned);
  const previousBadge =
    badgesWithStatus.filter((b) => b.earned).sort((a, b) => a.point - b.point).at(-1) ?? null;

  const progressToNext = (() => {
    if (!nextBadge) return 100;
    const prevPoint = previousBadge?.point ?? 0;
    const range = nextBadge.point - prevPoint;
    if (range === 0) return 100;
    const progress = totalReputation - prevPoint;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  })();

  // Loading / Error UI cho badges
  if (loadingBadges) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
            <Card className="p-8">
              <p className="text-sm text-muted-foreground">Loading badges…</p>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  if (errorBadges) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
            <Card className="p-8">
              <p className="text-sm text-red-600">Failed to load badges: {errorBadges}</p>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6" />
                <div>
                  <CardTitle className="text-2xl font-bold">Your Achievement Journey</CardTitle>
                  <p className="text-blue-50">
                    Track your progress and celebrate milestones as you contribute to SmartPath.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-blue-100">Reputation points</p>
                <p className="text-3xl font-semibold">{totalReputation}</p>
                <p className="text-sm text-blue-100">
                  {nextBadge
                    ? `${Math.max(nextBadge.point - totalReputation, 0)} points away from ${nextBadge.name}`
                    : 'You reached the highest tier!'}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Badges earned</p>
                <p className="text-3xl font-semibold">{earnedCount}</p>
                <p className="text-sm text-blue-100">
                  {badgesWithStatus.length - earnedCount} more to collect
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Progress to next badge</p>
                <Progress value={progressToNext} className="h-2 bg-blue-400/50" />
                <p className="text-sm text-blue-100 mt-2">
                  {nextBadge
                    ? `You're ${progressToNext.toFixed(0)}% of the way to ${nextBadge.name}.`
                    : 'You have unlocked every badge. Incredible!'}
                </p>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Badge Collection</h2>
              <BadgePill variant="secondary">{badgesWithStatus.length}</BadgePill>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badgesWithStatus.map((badge) => (
                <Card
                  key={badge.id}
                  className={`border ${
                    badge.earned
                      ? 'border-amber-400 shadow-lg shadow-amber-200/40 dark:shadow-amber-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Medal
                          className={`h-5 w-5 ${
                            badge.earned ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        />
                        <CardTitle className="text-lg font-semibold">{badge.name}</CardTitle>
                      </div>
                      <BadgePill variant={badge.earned ? 'default' : 'outline'}>
                        {badge.point} pts
                      </BadgePill>
                    </div>
                    {/* Backend chưa có description -> fallback để không vỡ UI */}
                    <p className="text-sm text-muted-foreground">{badge.description ?? ''}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Target className="h-4 w-4" />
                      <span>
                        {badge.earned
                          ? 'Unlocked'
                          : `${Math.max(badge.point - totalReputation, 0)} points to unlock`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
