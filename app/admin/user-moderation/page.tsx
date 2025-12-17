'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { userAPI } from '@/lib/api/userAPI';
import type { AdminActivityDaily, AdminDailyCount, UserAdminSummary, UserProfile } from '@/lib/types';
import { TrendingUp, UserX, ShieldCheck } from 'lucide-react';
import { UserGrowthChart, ActivityChart } from '@/components/admin/UserCharts';

export default function UserModerationPage() {
    const { profile } = useAuth();
    const { toast } = useToast();

    const isAdmin = useMemo(() => {
        const r: any = (profile as any)?.role;
        if (!r) return false;
        if (typeof r === 'string') return r.toLowerCase() === 'admin';
        if (typeof r === 'number') return r === 0; // Role.Admin = 0
        return false;
    }, [profile]);

    // ===== Analytics =====
    const [userGrowth, setUserGrowth] = useState<AdminDailyCount[]>([]);
    const [activity, setActivity] = useState<AdminActivityDaily[]>([]);

    // ===== Users =====
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [q, setQ] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [pageSize] = useState(20);

    // ===== Drawer =====
    const [selected, setSelected] = useState<UserProfile | null>(null);
    const [summary, setSummary] = useState<UserAdminSummary | null>(null);
    const [banUntil, setBanUntil] = useState<string>('');
    const [banReason, setBanReason] = useState<string>('');

    // 👉 MỌI HOOK PHẢI KHAI BÁO TRƯỚC KHI RETURN — KHÔNG early return ở trên
    const now = new Date();

    // ===== Load analytics =====
    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            try {
                const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const to = now.toISOString();
                const [growthRes, activityRes] = await Promise.all([
                    userAPI.usersCreatedRange(from, to),
                    userAPI.activityRange(from, to),
                ]);
                setUserGrowth(growthRes);
                setActivity(activityRes);
            } catch (e: any) {
                console.error('Load analytics error:', e);
            }
        })();
    }, [isAdmin]);

    // ===== Load users =====
    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            setLoadingUsers(true);
            try {
                const result = await userAPI.getUsers({
                    q: q || undefined,
                    page: currentPage,
                    pageSize
                });
                setUsers(result.items);
                setTotalUsers(result.total);
            } catch (e: any) {
                toast({ title: 'Lỗi', description: e?.message, variant: 'destructive' });
                setUsers([]);
                setTotalUsers(0);
            } finally {
                setLoadingUsers(false);
            }
        })();
    }, [isAdmin, q, currentPage, pageSize, toast]);

    // Reset to first page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [q]);

    // Handle page change (server-side)
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const openUser = async (u: UserProfile) => {
        setSelected(u);
        setSummary(null);
        try {
            const sum = await userAPI.summary(u.id);
            setSummary(sum);
        } catch (e: any) {
            toast({ title: 'Lỗi', description: e?.message, variant: 'destructive' });
        }
    };

    const ban = async () => {
        if (!selected) return;
        try {
            await userAPI.ban(
                selected.id, 
                banUntil ? new Date(banUntil).toISOString() : null,
                banReason
            );
            toast({ title: 'Thành công', description: 'Đã ban user' });
            // Refresh the user list
            const result = await userAPI.getUsers({
                q: q || undefined,
                page: currentPage,
                pageSize
            });
            setUsers(result.items);
            setTotalUsers(result.total);
            setSelected(null);
        } catch (e: any) {
            toast({ title: 'Lỗi', description: e?.message, variant: 'destructive' });
        }
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const result = await userAPI.getUsers({
                q: q || undefined,
                page: currentPage,
                pageSize
            });
            setUsers(result.items);
            setTotalUsers(result.total);
        } catch (e: any) {
            toast({ title: 'Lỗi', description: e?.message, variant: 'destructive' });
            setUsers([]);
            setTotalUsers(0);
        } finally {
            setLoadingUsers(false);
        }
    };

    const unban = async () => {
        if (!selected) return;
        try {
            await userAPI.unban(selected.id);
            toast({ title: 'Thành công', description: 'Đã unban user' });
            // Refresh the user list
            const result = await userAPI.getUsers({
                q: q || undefined,
                page: currentPage,
                pageSize
            });
            setUsers(result.items);
            setTotalUsers(result.total);
            setSelected(null);
        } catch (e: any) {
            toast({ title: 'Unban thất bại', description: e?.message, variant: 'destructive' });
        }
    };

    // Thay vì early return, render gate trong JSX dưới:
    return !isAdmin ? (
        <div>Bạn không có quyền truy cập.</div>
    ) : (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">User Management</h1>

            {/* Analytics */}
            <Card>
                <CardHeader className="flex flex-col gap-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Analytics (Last 30 days)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* User growth chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <UserGrowthChart data={userGrowth} />
                        <ActivityChart data={activity} />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Users</CardTitle>
                    <Input
                        placeholder="Search users..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="max-w-sm"
                    />
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Point</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingUsers ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6">Loading...</TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6">No users found</TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell>{u.username}</TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>{typeof u.role === 'number' ? (u.role === 0 ? 'admin' : 'student') : (u.role || '')}</TableCell>
                                            <TableCell>{u.point ?? 0}</TableCell>
                                            <TableCell>{u.isBanned ? 'BANNED' : 'Active'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => openUser(u)}>Details</Button>
                                                {u.isBanned ? (
                                                    <Button size="sm" onClick={async () => { setSelected(u); await unban(); }}>Unban</Button>
                                                ) : (
                                                    <Button size="sm" variant="destructive" onClick={() => { setSelected(u); }}>Ban</Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Pagination */}
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Showing {users.length} of {totalUsers} users
                        </span>
                        {Math.ceil(totalUsers / pageSize) > 1 && (
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={Math.ceil(totalUsers / pageSize)}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* User Details Dialog */}
            <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setSummary(null); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User details</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><b>Username:</b> {selected.username}</div>
                                <div><b>Email:</b> {selected.email}</div>
                                <div><b>Role:</b> {typeof selected.role === 'number' ? (selected.role === 0 ? 'admin' : 'student') : (selected.role || '')}</div>
                                <div><b>Point:</b> {selected.point ?? 0}</div>
                                <div><b>Status:</b> {selected.isBanned ? 'BANNED' : 'Active'}</div>
                                <div><b>Joined:</b> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</div>
                            </div>

                            {summary && (
                                <div className="rounded-md border p-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div><b>Posts:</b> {summary.posts}</div>
                                    <div><b>Comments:</b> {summary.comments}</div>
                                    <div><b>Reactions:</b> {summary.reactions}</div>
                                    <div><b>Friends:</b> {summary.friends}</div>
                                    <div><b>Reports against:</b> {summary.reportsAgainst}</div>
                                    <div><b>Reports filed:</b> {summary.reportsFiled}</div>
                                </div>
                            )}

                            {selected.isBanned ? (
                                <div className="flex items-center gap-2">
                                    <Button onClick={unban}><ShieldCheck className="h-4 w-4 mr-1" />Unban</Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Ban until (optional, ISO)</Label>
                                    <Input type="datetime-local" value={banUntil} onChange={(e) => setBanUntil(e.target.value)} />
                                    <Label>Reason (optional)</Label>
                                    <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Spam, abuse, ..." />
                                    <Button variant="destructive" onClick={ban}><UserX className="h-4 w-4 mr-1" />Ban user</Button>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setSelected(null); setSummary(null); }}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}