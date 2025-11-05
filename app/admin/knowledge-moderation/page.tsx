'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { knowledgeAPI } from '@/lib/api/knowledgeAPI';
import type { KnowledgeDocumentDto } from '@/lib/types';

export default function KnowledgeModerationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isAdmin = useMemo(() => {
    const r: any = (profile as any)?.role;
    if (!r) return false;
    if (typeof r === 'string') return r.toLowerCase() === 'admin';
    if (typeof r === 'number') return r === 0; // Role.Admin
    return false;
  }, [profile]);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<KnowledgeDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<KnowledgeDocumentDto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMeta, setEditMeta] = useState('');

  useEffect(() => {
    if (isAdmin === false) {
      toast({ title: '403', description: 'Bạn không có quyền truy cập trang này.' });
      router.push('/forum');
    }
  }, [isAdmin, router, toast]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await knowledgeAPI.listDocuments(page, pageSize, q || undefined);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      toast({ title: 'Lỗi tải danh sách', description: e?.message ?? 'Không thể tải tài liệu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, pageSize]);

  // Ingest handlers
  const [ingestLoading, setIngestLoading] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textSource, setTextSource] = useState('');
  const [textContent, setTextContent] = useState('');

  const [urlTitle, setUrlTitle] = useState('');
  const [urlValue, setUrlValue] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [filesTitle, setFilesTitle] = useState('');
  const [filesSource, setFilesSource] = useState('');

  const doIngestText = async () => {
    if (!textTitle || !textContent) {
      toast({ title: 'Thiếu dữ liệu', description: 'Nhập Title và Text.' });
      return;
    }
    setIngestLoading(true);
    try {
      await knowledgeAPI.ingestText({ title: textTitle, sourceUrl: textSource || undefined, text: textContent });
      toast({ title: 'Đã ingest text' });
      setTextTitle(''); setTextSource(''); setTextContent('');
      load();
    } catch (e: any) {
      toast({ title: 'Lỗi ingest text', description: e?.message ?? 'Không thể ingest', variant: 'destructive' });
    } finally {
      setIngestLoading(false);
    }
  };

  const doIngestUrl = async () => {
    if (!urlValue) {
      toast({ title: 'Thiếu URL', description: 'Nhập URL nguồn.' });
      return;
    }
    setIngestLoading(true);
    try {
      await knowledgeAPI.ingestUrl({ url: urlValue, title: urlTitle || undefined });
      toast({ title: 'Đã ingest URL' });
      setUrlTitle(''); setUrlValue('');
      load();
    } catch (e: any) {
      toast({ title: 'Lỗi ingest URL', description: e?.message ?? 'Không thể ingest', variant: 'destructive' });
    } finally {
      setIngestLoading(false);
    }
  };

  const doIngestFiles = async () => {
    if (!files.length) {
      toast({ title: 'Thiếu file', description: 'Chọn ít nhất một file.' });
      return;
    }
    setIngestLoading(true);
    try {
      await knowledgeAPI.ingestFiles(files, { title: filesTitle || undefined, sourceUrl: filesSource || undefined });
      toast({ title: 'Đã ingest file' });
      setFiles([]); setFilesTitle(''); setFilesSource('');
      (document.getElementById('files-input') as HTMLInputElement | null)?.value && ((document.getElementById('files-input') as HTMLInputElement).value = '');
      load();
    } catch (e: any) {
      toast({ title: 'Lỗi ingest file', description: e?.message ?? 'Không thể ingest', variant: 'destructive' });
    } finally {
      setIngestLoading(false);
    }
  };

  const openEdit = (doc: KnowledgeDocumentDto) => {
    setEditing(doc);
    setEditTitle(doc.title ?? '');
    setEditMeta(doc.meta ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await knowledgeAPI.updateDocument(editing.id, { title: editTitle || null, meta: editMeta || null });
      toast({ title: 'Đã cập nhật tài liệu' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({ title: 'Lỗi cập nhật', description: e?.message ?? 'Không thể cập nhật', variant: 'destructive' });
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Xóa tài liệu này?')) return;
    try {
      await knowledgeAPI.deleteDocument(id);
      toast({ title: 'Đã xóa' });
      load();
    } catch (e: any) {
      toast({ title: 'Lỗi xóa', description: e?.message ?? 'Không thể xóa', variant: 'destructive' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Knowledge Moderation</h1>
            </div>

            {/* Ingest */}
            <Card>
              <CardHeader>
                <CardTitle>Ingest dữ liệu</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text">
                  <TabsList>
                    <TabsTrigger value="text">Text</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-3 pt-4">
                    <div>
                      <Label>Title</Label>
                      <Input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} placeholder="VD: AWS EC2 notes" />
                    </div>
                    <div>
                      <Label>Source URL (optional)</Label>
                      <Input value={textSource} onChange={(e) => setTextSource(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                      <Label>Text</Label>
                      <Textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={6} placeholder="Dán nội dung..." />
                    </div>
                    <Button onClick={doIngestText} disabled={ingestLoading}>Ingest Text</Button>
                  </TabsContent>

                  <TabsContent value="url" className="space-y-3 pt-4">
                    <div>
                      <Label>URL</Label>
                      <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                      <Label>Title (optional)</Label>
                      <Input value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} placeholder="Tùy chọn tiêu đề" />
                    </div>
                    <Button onClick={doIngestUrl} disabled={ingestLoading}>Ingest URL</Button>
                  </TabsContent>

                  <TabsContent value="files" className="space-y-3 pt-4">
                    <div>
                      <Label>Files</Label>
                      <Input id="files-input" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Title (optional)</Label>
                        <Input value={filesTitle} onChange={(e) => setFilesTitle(e.target.value)} placeholder="Tên chung cho tài liệu" />
                      </div>
                      <div>
                        <Label>Source URL (optional)</Label>
                        <Input value={filesSource} onChange={(e) => setFilesSource(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>
                    <Button onClick={doIngestFiles} disabled={ingestLoading}>Ingest Files</Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* List */}
            <Card>
              <CardHeader className="flex flex-col gap-3">
                <CardTitle>Danh sách tài liệu</CardTitle>
                <div className="flex items-center gap-2">
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tiêu đề..." className="max-w-xs" />
                  <Button variant="secondary" onClick={() => { setPage(1); load(); }}>Tìm</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tiêu đề</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Chunks</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.title ?? '(no title)'}</TableCell>
                          <TableCell>{d.sourceUrl ? <a className="underline" href={d.sourceUrl} target="_blank" rel="noreferrer">link</a> : '-'}</TableCell>
                          <TableCell>{d.chunkCount}</TableCell>
                          <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Sửa</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteDoc(d.id)}>Xóa</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!items.length && !loading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">Không có tài liệu</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">Tổng: {total}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                    <span className="text-sm">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tài liệu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <Label>Meta (JSON/String)</Label>
              <Textarea rows={4} value={editMeta} onChange={(e) => setEditMeta(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={saveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}