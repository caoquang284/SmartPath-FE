'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Database
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const isGuest = !profile?.id;

  const mainLinks = [
    { href: '/forum', icon: Home, label: 'Trang chủ' },
    { href: '/materials', icon: BookOpen, label: 'Tài liệu' },
  ];

  const socialLinks = [
    { href: '/friends', icon: UserPlus, label: 'Bạn bè' },
    { href: '/messages', icon: MessageSquare, label: 'Tin nhắn' },
    { href: '/chatbot', icon: BotIcon, label: 'Chatbot' },
  ];

  const bottomLinks = [
    { href: '/dashboard', icon: Settings, label: 'Dashboard' },
    { href: '/achievements', icon: Award, label: 'Thành tựu' },
  ];

  const adminLinks = [
    { href: '/admin/achievement-moderation', icon: ShieldCheck, label: 'Quản trị thành tựu' },
    { href: '/admin/material-moderation', icon: FileText, label: 'Quản trị tài liệu' },
    { href: '/admin/user-moderation', icon: UsersIcon, label: 'Quản trị người dùng' },
    { href: '/admin/knowledge-moderation', icon: Database, label: 'Quản trị dataset chatbot' },
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
    return (
      <Link key={link.href} href={link.href}>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start',
            isActive && 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
          )}
        >
          <Icon className="mr-2 h-4 w-4" />
          {link.label}
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
            Chính
          </h3>
          <nav className="space-y-1">
            {mainLinks.map(renderLinkBtn)}
          </nav>
        </div>

        {/* Social */}
        <div>
          <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Xã hội
          </h3>
          <nav className="space-y-1">
            {socialLinks.map(renderLinkBtn)}
          </nav>
        </div>

        {/* Admin */}
        {isAdmin && (
          <div>
            <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </h3>
            <nav className="space-y-1">{adminLinks.map(renderLinkBtn)}</nav>
          </div>
        )}

        {/* Account */}
        <div className="mt-auto">
          <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Cá nhân
          </h3>
          <nav className="space-y-1">
            {bottomLinks.map(renderLinkBtn)}
          </nav>
        </div>
      </div>

      <Card className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
        <h3 className="font-semibold mb-2">Study Tip</h3>
        <p className="text-xs text-blue-50">
          Join a study group to collaborate with peers and boost your learning!
        </p>
      </Card>
    </aside>
  );
}