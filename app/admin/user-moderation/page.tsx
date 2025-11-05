'use client';

import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { userAPI } from '@/lib/api/userAPI';
import type { AdminActivityDaily, AdminDailyCount, UserAdminSummary, UserProfile } from '@/lib/types';
import { TrendingUp, UserX, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, BarChart, Bar, CartesianGrid, Legend } from 'recharts';

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
    // ❌ BỎ HOÀN TOÀN 'days' + effect theo days
    // const [days, setDays] = useState(30);

    const [userGrowth, setUserGrowth] = useState<AdminDailyCount[]>([]);
    const [activity, setActivity] = useState<AdminActivityDaily[]>([]);

    // ===== Users =====
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [q, setQ] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);

    // ===== Drawer =====
    const [selected, setSelected] = useState<UserProfile | null>(null);
    const [summary, setSummary] = useState<UserAdminSummary | null>(null);
    const [banUntil, setBanUntil] = useState<string>('');
    const [banReason, setBanReason] = useState<string>('');

    // 👉 MỌI HOOK PHẢI KHAI BÁO TRƯỚC KHI RETURN — KHÔNG early return ở trên
    const now = new Date();
    const [fromMonth, setFromMonth] = useState<number>(now.getMonth() + 1);
    const [fromYear, setFromYear] = useState<number>(now.getFullYear());
    const [toMonth, setToMonth] = useState<number>(now.getMonth() + 1);
    const [toYear, setToYear] = useState<number>(now.getFullYear());

    const range = useMemo(() => {
        const start = new Date(Date.UTC(fromYear, fromMonth - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(toYear, toMonth, 0, 23, 59, 59, 999));
        return {
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            label: `${start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} → ${end.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
        };
    }, [fromMonth, fromYear, toMonth, toYear]);

    // Nạp analytics theo RANGE
    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            try {
                const [gRaw, aRaw] = await Promise.all([
                    userAPI.usersCreatedRange(range.startIso, range.endIso),
                    userAPI.activityRange(range.startIso, range.endIso),
                ]);

                // normalize keys
                const g = (gRaw ?? []).map((x: any) => ({
                    date: x.date ?? x.Date,
                    count: x.count ?? x.Count ?? 0,
                }));
                const a = (aRaw ?? []).map((x: any) => ({
                    date: x.date ?? x.Date,
                    posts: x.posts ?? x.Posts ?? 0,
                    comments: x.comments ?? x.Comments ?? 0,
                    reactions: x.reactions ?? x.Reactions ?? 0,
                    reports: x.reports ?? x.Reports ?? 0,
                    newUsers: x.newUsers ?? x.NewUsers ?? 0,
                }));

                setUserGrowth(g);
                setActivity(a);
            } catch (e: any) {
                toast({ title: 'Lỗi analytics', description: e?.message, variant: 'destructive' });
            }
        })();
    }, [isAdmin, range.startIso, range.endIso, toast]);

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const all = await userAPI.getAll();
            const filtered = q
                ? all.filter(u =>
                    (u.username || '').toLowerCase().includes(q.toLowerCase()) ||
                    (u.fullName || '').toLowerCase().includes(q.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(q.toLowerCase())
                )
                : all;
            setUsers(filtered);
        } catch (e: any) {
            toast({ title: 'Lỗi tải users', description: e?.message, variant: 'destructive' });
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

    const openUser = async (u: UserProfile) => {
        setSelected(u); setSummary(null);
        try { const s = await userAPI.summary(u.id); setSummary(s); }
        catch (e: any) { toast({ title: 'Lỗi tải summary', description: e?.message, variant: 'destructive' }); }
    };

    const ban = async () => {
        if (!selected) return;
        try {
            await userAPI.ban(selected.id, banUntil || null, banReason || null);
            toast({ title: 'Đã ban user' });
            setSelected(null); setBanUntil(''); setBanReason('');
            loadUsers();
        } catch (e: any) { toast({ title: 'Ban thất bại', description: e?.message, variant: 'destructive' }); }
    };

    const unban = async () => {
        if (!selected) return;
        try {
            await userAPI.unban(selected.id);
            toast({ title: 'Đã unban user' });
            setSelected(null);
            loadUsers();
        } catch (e: any) { toast({ title: 'Unban thất bại', description: e?.message, variant: 'destructive' }); }
    };

    // Thay vì early return, render gate trong JSX dưới:
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                    {!isAdmin ? (
                        <div>Bạn không có quyền truy cập.</div>
                    ) : (
                        <div className="space-y-6">
                            <h1 className="text-3xl font-bold">User Management</h1>

                            {/* Analytics */}
                            <Card>
                                <CardHeader className="flex flex-col gap-2">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        Analytics — {range.label}
                                    </CardTitle>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Label>From</Label>
                                        <select className="border rounded px-2 py-1" value={fromMonth} onChange={e => setFromMonth(parseInt(e.target.value, 10))}>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                                        </select>
                                        <select className="border rounded px-2 py-1" value={fromYear} onChange={e => setFromYear(parseInt(e.target.value, 10))}>
                                            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>

                                        <Label>To</Label>
                                        <select className="border rounded px-2 py-1" value={toMonth} onChange={e => setToMonth(parseInt(e.target.value, 10))}>
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                                        </select>
                                        <select className="border rounded px-2 py-1" value={toYear} onChange={e => setToYear(parseInt(e.target.value, 10))}>
                                            {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>

                                        <Button variant="secondary" onClick={async () => {
                                            try {
                                                const [gRaw, aRaw] = await Promise.all([
                                                    userAPI.usersCreatedRange(range.startIso, range.endIso),
                                                    userAPI.activityRange(range.startIso, range.endIso),
                                                ]);
                                                const g = (gRaw ?? []).map((x: any) => ({ date: x.date ?? x.Date, count: x.count ?? x.Count ?? 0 }));
                                                const a = (aRaw ?? []).map((x: any) => ({
                                                    date: x.date ?? x.Date,
                                                    posts: x.posts ?? x.Posts ?? 0,
                                                    comments: x.comments ?? x.Comments ?? 0,
                                                    reactions: x.reactions ?? x.Reactions ?? 0,
                                                    reports: x.reports ?? x.Reports ?? 0,
                                                    newUsers: x.newUsers ?? x.NewUsers ?? 0,
                                                }));
                                                setUserGrowth(g); setActivity(a);
                                            } catch { }
                                        }}>
                                            Refresh
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="h-64">
                                        {userGrowth.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                Không có dữ liệu trong khoảng đã chọn.
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={userGrowth}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                                                    <YAxis />
                                                    <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleString()} />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="count" name="New Users" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>

                                    <div className="h-64">
                                        {activity.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                Không có dữ liệu trong khoảng đã chọn.
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={activity}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                                                    <YAxis />
                                                    <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleString()} />
                                                    <Legend />
                                                    <Bar dataKey="posts" name="Posts" />
                                                    <Bar dataKey="comments" name="Comments" />
                                                    <Bar dataKey="reactions" name="Reactions" />
                                                    <Bar dataKey="reports" name="Reports" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-col gap-2">
                                    <CardTitle>Users</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Input placeholder="Search name/email/username" value={q} onChange={(e) => setQ(e.target.value)} />
                                        <Button variant="secondary" onClick={loadUsers}>Search</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Username</TableHead>
                                                    <TableHead>Full name</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>Point</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {users.map(u => (
                                                    <TableRow key={u.id}>
                                                        <TableCell className="font-medium">{u.username}</TableCell>
                                                        <TableCell>{u.fullName || '-'}</TableCell>
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
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </main>
            </div>

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
