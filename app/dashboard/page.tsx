'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import Link from 'next/link';

import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Award, BookOpen, MessageSquare, TrendingUp, XCircle, AlertCircle } from 'lucide-react';

import { postAPI } from '@/lib/api/postAPI';
import { commentAPI } from '@/lib/api/commentAPI';
import { materialAPI, type MaterialResponse } from '@/lib/api/materialAPI';
import { systemLogAPI } from '@/lib/api/systemLogAPI';
import type { SystemLog } from '@/lib/types';
import { useRouter } from 'next/navigation';

import { mapPostToUI, type UIPost } from '@/lib/mappers/postMapper';

type DashboardStats = {
  reputation: number;
  postsCount: number;
  commentsCount: number;
  materialsCount: number;
  rejectedPostsCount: number;
};

type ActivityItem = {
  id: string;
  label: string;
  createdAt: string;
  icon: 'post' | 'comment' | 'reaction' | 'report' | 'activity';
  href?: string;
};

const verbVi: Record<'create' | 'update' | 'delete', string> = {
  create: 'Đăng',
  update: 'Cập nhật',
  delete: 'Xoá',
};

// ---------------- Helpers: phân loại, parse URL, ngày giờ ----------------

function inferKindFromUrl(url?: string | null): ActivityItem['icon'] {
  if (!url) return 'activity';
  const u = url.toLowerCase();
  if (u.includes('/comment')) return 'comment';
  if (u.includes('/reaction')) return 'reaction';
  if (u.includes('/report')) return 'report';
  if (u.includes('/post') || u.includes('/posts') || u.includes('/forum')) return 'post';
  return 'activity';
}

function getKindFromLog(log: SystemLog): ActivityItem['icon'] {
  const raw = (log as any).target_type ?? (log as any).targetType ?? null;
  if (raw === 'post' || raw === 'comment' || raw === 'reaction' || raw === 'report') return raw;
  return inferKindFromUrl(log.url);
}

function parseFlexibleDate(input?: string): Date | null {
  if (!input) return null;
  let s = String(input).trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
  s = s.replace(/(\.\d{3})\d+/, '$1');          // .11641 -> .116
  s = s.replace(/([+-]\d{2})$/, '$1:00');       // +00 -> +00:00
  s = s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');// +0700 -> +07:00

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function renderRelative(createdAt: string) {
  const d = parseFlexibleDate(createdAt);
  return d ? formatDistanceToNow(d, { addSuffix: true, locale: vi }) : '—';
}

const GUID_RX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractCommentIdFromLog(log: SystemLog): string | null {
  const raw = (log.url || '').trim();
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://dummy.local';
  try {
    const u = new URL(raw, base);
    const params = u.searchParams;
    const byC = params.get('c');
    if (byC) return byC;
    const byCommentId = params.get('commentId') || params.get('comment');
    if (byCommentId) return byCommentId;
  } catch { /* ignore */ }
  if ((log as any).description) {
    const m = String((log as any).description).match(GUID_RX);
    if (m) return m[0];
  }
  return null;
}

function extractPostIdFromUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://dummy.local';
  try {
    const u = new URL(rawUrl, base);
    const m1 = u.pathname.match(/^\/(forum|posts|post|forum\/posts)\/([^/?#]+)$/i);
    if (m1) return m1[2];
    const m2 = u.pathname.match(/^\/api\/post\/([^/?#]+)$/i);
    if (m2) return m2[1];
  } catch {
    // thử ghép base
    try {
      const u2 = new URL(base + rawUrl);
      const m1 = u2.pathname.match(/^\/(forum|posts|post|forum\/posts)\/([^/?#]+)$/i);
      if (m1) return m1[2];
      const m2 = u2.pathname.match(/^\/api\/post\/([^/?#]+)$/i);
      if (m2) return m2[1];
    } catch { /* ignore */ }
  }
  return null;
}

function buildForumHref(postId: string, commentId?: string | null) {
  if (commentId) {
    const c = encodeURIComponent(commentId);
    return `/forum/${postId}?c=${c}#comment-${c}`;
  }
  return `/forum/${postId}`;
}

// ---------------- Map SystemLog -> ActivityItem (cơ bản, chưa enrich) ----------------

function mapLogToActivityBase(log: SystemLog): ActivityItem {
  const rawAction = (log.action || '').toLowerCase() as 'create' | 'update' | 'delete';
  const action: 'create' | 'update' | 'delete' =
    rawAction === 'create' || rawAction === 'delete' || rawAction === 'update' ? rawAction : 'update';

  const icon = getKindFromLog(log);

  // cố lấy commentId ngay từ log (nếu có)
  const cid = icon === 'comment' ? extractCommentIdFromLog(log) : null;
  const postId = extractPostIdFromUrl(log.url);

  let href: string | undefined = undefined;
  if (postId) {
    href = buildForumHref(postId, cid || undefined);
  }

  const noun =
    icon === 'post' ? 'bài viết' :
    icon === 'comment' ? 'bình luận' :
    icon === 'reaction' ? 'phản ứng' :
    icon === 'report' ? 'báo cáo' :
    'hoạt động';

  const label =
    (log as any).description?.trim()
      ? (log as any).description
      : `${verbVi[action]} ${noun}`;

  return {
    id: log.id,
    label,
    createdAt: (log as any).created_at ?? (log as any).createdAt ?? '',
    icon,
    href,
  };
}

// ---------------- Enricher: tìm commentId khi thiếu ----------------

async function enrichActivityIfComment(
  item: ActivityItem,
  log: SystemLog,
  currentUserId?: string
): Promise<ActivityItem> {
  if (item.icon !== 'comment') return item;
  // đã có href với ?c=... rồi thì thôi
  if (item.href && /[?&]c=/.test(item.href)) return item;

  const postId = extractPostIdFromUrl(log.url);
  if (!postId || !currentUserId) return item;

  // timestamp từ log để khớp comment gần nhất
  const ts = parseFlexibleDate((log as any).created_at ?? (log as any).createdAt)?.getTime() ?? 0;

  try {
    const list = await commentAPI.getByPost(postId);
    // chỉ xét comment do chính user tạo
    const mine = list.filter((c: any) => String(c.authorId) === String(currentUserId));
    if (!mine.length) return item;

    // pick comment có createdAt gần ts nhất
    let best: any | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const c of mine) {
      const t = parseFlexibleDate((c as any).createdAt ?? (c as any).created_at)?.getTime() ?? 0;
      const diff = Math.abs(t - ts);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }

    if (best && best.id) {
      return {
        ...item,
        href: buildForumHref(postId, String(best.id)),
      };
    }
  } catch {
    // bỏ qua nếu lỗi API
  }

  return item;
}

// ===================================================================

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    reputation: 0,
    postsCount: 0,
    commentsCount: 0,
    materialsCount: 0,
    rejectedPostsCount: 0,
  });
  const [recent, setRecent] = useState<ActivityItem[]>([]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Đăng nhập để sử dụng tính năng này
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
    );
  }

  const loadData = useCallback(async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      // ----- Stats (giữ nguyên logic cũ) -----
      const rawPosts = await postAPI.getByUser(profile.id);
      const posts: UIPost[] = rawPosts.map(mapPostToUI);
      const postsCount = posts.length;
      const rejectedPostsCount = posts.filter(p => p.status === 'Rejected').length;

      const materialsByPostSettled = await Promise.allSettled(
        posts.map((p) => materialAPI.listByPost(p.id))
      );
      const materialsFromPosts: MaterialResponse[] = materialsByPostSettled.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : []
      );

      let myCommentsCount = 0;
      const myCommentIds: string[] = [];

      const commentsByPostSettled = await Promise.allSettled(
        posts.map((p) => commentAPI.getByPost(p.id))
      );
      commentsByPostSettled.forEach((res) => {
        if (res.status !== 'fulfilled') return;
        for (const c of res.value) {
          if (c.authorId === profile.id) {
            myCommentsCount += 1;
            myCommentIds.push(c.id);
          }
        }
      });

      const materialsByMyCommentsSettled = await Promise.allSettled(
        myCommentIds.map((cid) => materialAPI.listByComment(cid))
      );
      const materialsFromMyComments: MaterialResponse[] = materialsByMyCommentsSettled.flatMap(
        (r) => (r.status === 'fulfilled' ? r.value : [])
      );

      setStats({
        reputation: profile.point ?? 0,
        postsCount,
        commentsCount: myCommentsCount,
        materialsCount: materialsFromPosts.length + materialsFromMyComments.length,
        rejectedPostsCount,
      });

      // ----- Recent Activity từ SystemLog -----
      const logs: SystemLog[] = await systemLogAPI.mine();

      // 1) map sơ bộ
      let base = logs.map(mapLogToActivityBase);

      // 2) enrich cho activity comment thiếu commentId → đoán bằng cách fetch comments theo postId và khớp theo thời gian
      base = await Promise.all(base.map((it, i) => enrichActivityIfComment(it, logs[i], profile.id)));

      // 3) sort & slice
      const activities = base
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setRecent(activities);
    } catch (e) {
      console.error('Load dashboard failed:', e);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.point]);

  useEffect(() => {
    if (profile?.id) loadData();
  }, [profile?.id, loadData]);

  const RecentActivity = useMemo(() => {
    if (loading) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Đang tải hoạt động gần đây...
        </p>
      );
    }

    if (!recent.length) {
      return (
        <p className="text-muted-foreground text-center py-8">
          Chưa có hoạt động nào
        </p>
      );
    }

    const IconFor = (icon: ActivityItem['icon']) => {
      switch (icon) {
        case 'post':
          return <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />;
        case 'comment':
          return <BookOpen className="h-4 w-4 text-muted-foreground mt-1" />;
        case 'reaction':
          return <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />;
        case 'report':
          return <Award className="h-4 w-4 text-muted-foreground mt-1" />;
        default:
          return <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />;
      }
    };

    return (
      <ul className="space-y-3">
        {recent.map((item) => {
          const clickable = !!item.href;
          const className =
            'flex items-start justify-between gap-4 p-2 rounded-md ' +
            (clickable ? 'hover:bg-accent/60 cursor-pointer' : 'opacity-80');

          const onOpen = () => {
            if (item.href) router.push(item.href);
          };

          return (
            <li key={item.id} className={className} onClick={onOpen}>
              <div>
                <p className={clickable ? 'font-medium hover:underline underline-offset-2' : 'font-medium'}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {renderRelative(item.createdAt)}
                  {!item.href && ' · (không có link)'}
                </p>
              </div>
              {IconFor(item.icon)}
            </li>
          );
        })}
      </ul>
    );
  }, [recent, loading, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile?.fullName ?? profile?.username ?? 'User'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reputation</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reputation}</div>
                  <p className="text-xs text-muted-foreground">Total points earned</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Posts</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '—' : stats.postsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Your contributions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Materials</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? '—' : stats.materialsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Files on your posts & comments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rank</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">N/A</div>
                  <p className="text-xs text-muted-foreground">Community ranking</p>
                </CardContent>
              </Card>
            </div>

            {/* Rejected Posts Alert */}
            {!loading && stats.rejectedPostsCount > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    Rejected Posts Need Attention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600 mb-4">
                    You have {stats.rejectedPostsCount} rejected {stats.rejectedPostsCount === 1 ? 'post' : 'posts'} that need your attention.
                  </p>
                  <Link href="/forum/rejected">
                    <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-100">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      View Rejected Posts
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>{RecentActivity}</CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
