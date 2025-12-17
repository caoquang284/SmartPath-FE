'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  MessageSquare,
  BookOpen,
  UserPlus,
  Settings,
  Award,
  BotIcon,
  ShieldCheck,
  FileText,
  UsersIcon,
  Database,
  FolderTree,
  Search,
  Folder
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMessageNotifications } from '@/hooks/use-message-notifications';
import { useLanguage } from '@/context/LanguageContext';

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { unreadCount } = useMessageNotifications(profile?.id);
  const { t } = useLanguage();
  const isGuest = !profile?.id;

  const mainLinks = [
    { href: '/forum', icon: Home, label: t.nav.home },
    { href: '/search', icon: Search, label: t.nav.search },
    { href: '/materials', icon: BookOpen, label: t.nav.materials },
    { href: '/materials/my-materials', icon: Folder, label: t.nav.myMaterials },
  ];

  const socialLinks = [
    { href: '/friends', icon: UserPlus, label: t.nav.friends },
    { href: '/messages', icon: MessageSquare, label: t.nav.messages },
    { href: '/chatbot', icon: BotIcon, label: t.nav.chatbot },
  ];

  const bottomLinks = [
    { href: '/dashboard', icon: Settings, label: t.nav.dashboard },
    { href: '/achievements', icon: Award, label: t.nav.achievements },
  ];

  const adminLinks = [
    { href: '/admin/badge-moderation', icon: ShieldCheck, label: t.sidebar.adminBadge },
    { href: '/admin/materials', icon: FileText, label: t.sidebar.adminMaterials },
    { href: '/admin/categories', icon: FolderTree, label: t.sidebar.adminCategories },
    { href: '/admin/user-moderation', icon: UsersIcon, label: t.sidebar.adminUsers },
    { href: '/admin/knowledge-moderation', icon: Database, label: t.sidebar.adminKnowledge },
  ];

  // ---- Normalize profile fields (chỉ dùng khi không phải guest) ----
  const fullName =
    (profile as any)?.fullName ??
    (profile as any)?.full_name ??
    'User';

  const point =
    (profile as any)?.point ??
    (profile as any)?.reputation_points ??
    0;

  const rawAvatar =
    (profile as any)?.avatarUrl ??
    (profile as any)?.avatar_url ??
    undefined;

  const avatarVersion =
    (profile as any)?.updatedAt ??
    (profile as any)?.avatarUpdatedAt ??
    '';

  const avatarSrc = useMemo(() => {
    if (!rawAvatar) return undefined;
    return avatarVersion ? `${rawAvatar}?v=${encodeURIComponent(avatarVersion)}` : rawAvatar;
  }, [rawAvatar, avatarVersion]);

  const isAdmin = (() => {
    const r: any = (profile as any)?.role;
    if (!r) return false;
    if (typeof r === 'string') return r.toLowerCase() === 'admin';
    if (typeof r === 'number') return r === 0;
    return false;
  })();

  const renderLinkBtn = (link: { href: string; icon: any; label: string }) => {
    const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
    const Icon = link.icon;
    const showBadge = link.href === '/messages' && unreadCount > 0;
    return (
      <Link key={link.href} href={link.href}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start',
            isActive && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <Icon className="mr-2 h-4 w-4" />
              {link.label}
            </div>
            {showBadge && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </Button>
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col gap-4 p-4 border-r bg-slate-50/50 dark:bg-slate-950/50 min-h-[calc(100vh-4rem)] lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto scrollbar-hide">
      {/* User card: ẨN khi guest */}
      {!isGuest && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarSrc} alt={fullName || 'Avatar'} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                {(fullName || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground">{point} reputation</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex-1 space-y-6">
        {/* Main (luôn hiển thị) */}
        <div>
          <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.sidebar.main}
          </h3>
          <nav className="space-y-1">
            {mainLinks.map(renderLinkBtn)}
          </nav>
        </div>

        {/* Social */}
        <div>
          <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.sidebar.social}
          </h3>
          <nav className="space-y-1">
            {socialLinks.map(renderLinkBtn)}
          </nav>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div>
            <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.sidebar.admin}
            </h3>
            <nav className="space-y-1">{adminLinks.map(renderLinkBtn)}</nav>
          </div>
        )}

        {/* Account */}
        <div className="mt-auto">
          <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.sidebar.personal}
          </h3>
          <nav className="space-y-1">
            {bottomLinks.map(renderLinkBtn)}
          </nav>
        </div>
      </div>

      <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
        <h3 className="font-semibold mb-2">{t.sidebar.studyTip}</h3>
        <p className="text-xs text-blue-50">
          {t.sidebar.studyTipDesc}
        </p>
      </Card>
    </aside>
  );
}