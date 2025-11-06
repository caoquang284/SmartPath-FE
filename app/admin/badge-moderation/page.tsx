'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge as Pill } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { badgeAPI } from '@/lib/api/badgeAPI';
import type { BadgeRequestDto, BadgeResponseDto } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUpDown,
  Shield,
  Award,
  Info,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'name' | 'point' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export default function AdminBadgesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeResponseDto[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('point');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeResponseDto | null>(null);
  const [form, setForm] = useState<BadgeRequestDto>({ name: '', point: 0 });
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load all badges
  useEffect(() => {
    (async () => {
      try {
        const data = await badgeAPI.getAll();
        // Optional: sort default by point asc
        data.sort((a, b) => (a.point ?? 0) - (b.point ?? 0));
        setBadges(data);
      } catch (err: any) {
        toast({
          title: 'Không tải được danh sách badge',
          description: err?.message ?? 'Vui lòng thử lại.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = badges.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        String(b.point).includes(q),
    );
    list = list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortKey === 'point') return ((a.point ?? 0) - (b.point ?? 0)) * dir;
      const aTime = (a as any)?.createdAt ? Date.parse((a as any).createdAt) : 0;
      const bTime = (b as any)?.createdAt ? Date.parse((b as any).createdAt) : 0;
      return (aTime - bTime) * dir;
    });
    return list;
  }, [badges, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', point: 0 });
    setDialogOpen(true);
  }

  function openEdit(b: BadgeResponseDto) {
    setEditing(b);
    setForm({ name: b.name, point: b.point });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    // simple validations
    if (!form.name?.trim()) {
      toast({ title: 'Tên badge không được trống', variant: 'destructive' });
      return;
    }
    if (form.point == null || Number.isNaN(Number(form.point))) {
      toast({ title: 'Điểm phải là số hợp lệ', variant: 'destructive' });
      return;
    }
    if (form.point < 0) {
      toast({ title: 'Điểm không được âm', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const updated = await badgeAPI.update(editing.id, form);
        setBadges((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        toast({ title: 'Cập nhật badge thành công' });
      } else {
        const created = await badgeAPI.create(form);
        setBadges((prev) => [...prev, created]);
        toast({ title: 'Tạo badge thành công' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      // Backend returns { message, field? } for 400 and { message } for 409
      const msg = err?.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.';
      toast({ title: 'Không thể lưu badge', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await badgeAPI.delete(deleteId);
      setBadges((prev) => prev.filter((x) => x.id !== deleteId));
      toast({ title: 'Đã xoá badge' });
      setDeleteId(null);
    } catch (err: any) {
      toast({
        title: 'Không xoá được badge',
        description: err?.message ?? 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  function resetFilters() {
    setSearch('');
    setSortKey('point');
    setSortDir('asc');
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Badge Management</h1>
                <p className="text-muted-foreground">
                  Quản lý các cấp huy hiệu dựa trên điểm tích luỹ của người dùng.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo badge
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tổng số badge
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{badges.length}</div>
                  <Award className="h-6 w-6 opacity-70" />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Điểm thấp nhất / cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-3xl font-bold">
                    {badges.length
                      ? `${Math.min(...badges.map((b) => b.point ?? 0))} / ${Math.max(
                          ...badges.map((b) => b.point ?? 0),
                        )}`
                      : '—'}
                  </div>
                  <Shield className="h-6 w-6 opacity-70" />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Bộ lọc đang dùng
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm">
                    <div>Từ khoá: <span className="font-medium">{search || '—'}</span></div>
                    <div>
                      Sắp xếp: <span className="font-medium">{sortKey}</span> ({sortDir})
                    </div>
                  </div>
                  <Info className="h-6 w-6 opacity-70" />
                </CardContent>
              </Card>
            </div>

            {/* Toolbar */}
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm theo tên, điểm"
                      className="pl-9"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('name')}
                      className={cn(sortKey === 'name' && 'ring-2 ring-primary/50')}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Name
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('point')}
                      className={cn(sortKey === 'point' && 'ring-2 ring-primary/50')}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Point
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSort('createdAt')}
                      className={cn(sortKey === 'createdAt' && 'ring-2 ring-primary/50')}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Created
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-4 py-3 w-[60px]">#</th>
                        <th className="px-4 py-3">Badge</th>
                        <th className="px-4 py-3">Point</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right w-[160px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                            Đang tải…
                          </td>
                        </tr>
                      ) : pageItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                            Không có badge nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        pageItems.map((b, idx) => (
                          <tr
                            key={b.id}
                            className="border-t hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 align-top">
                              {(page - 1) * PAGE_SIZE + idx + 1}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-3">
                                <Pill variant="secondary" className="text-xs px-2 py-1">
                                  {b.name}
                                </Pill>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top font-medium">{b.point}</td>
                            <td className="px-4 py-3 align-top text-muted-foreground">
                              {(b as any)?.description || '—'}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" onClick={() => openEdit(b)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => setDeleteId(b.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Xoá badge?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Thao tác này không thể hoàn tác. Người dùng mất liên kết
                                        đến badge này (nếu có logic tham chiếu). Bạn chắc chắn?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setDeleteId(null)}>
                                        Huỷ
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        disabled={deleting}
                                        onClick={handleDeleteConfirmed}
                                      >
                                        {deleting ? 'Đang xoá…' : 'Xoá'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Trang <span className="font-medium">{page}</span> / {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Cập nhật badge' : 'Tạo badge mới'}</DialogTitle>
            <DialogDescription>
              Đặt tên, điểm và mô tả (tuỳ chọn) cho badge.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Ví dụ: Bronze / Silver / Gold / Diamond…"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="point">Point</Label>
              <Input
                id="point"
                type="number"
                min={0}
                placeholder="0"
                value={form.point}
                onChange={(e) =>
                  setForm((f) => ({ ...f, point: Number(e.target.value || 0) }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                placeholder="Mô tả ngắn gọn cho badge (tuỳ chọn)…"
                value={(form as any).description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value } as any))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
