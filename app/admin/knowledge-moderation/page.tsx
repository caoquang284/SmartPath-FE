'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { KnowledgeDocumentDto, KnowledgePreviewResultDto } from '@/lib/types';

// Để ngoài component cho gọn
type PendingIngest =
  | { kind: 'text'; body: { title: string; sourceUrl?: string; text: string } }
  | { kind: 'url'; body: { url: string; title?: string } }
  | { kind: 'files'; files: File[]; meta: { title?: string; sourceUrl?: string } };

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

  // Preview ingest (NEW)
  const [previewItems, setPreviewItems] = useState<KnowledgePreviewResultDto[] | null>(null);
  const [pendingIngest, setPendingIngest] = useState<PendingIngest | null>(null);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);
  const [previewActionLoading, setPreviewActionLoading] = useState(false);

  const resetPreviewState = () => {
    setPreviewItems(null);
    setPendingIngest(null);
    setSelectedExistingIds([]);
    setPreviewActionLoading(false);
  };

  useEffect(() => {
    if (isAdmin === false) {
      toast({ title: '403', description: 'Bạn không có quyền truy cập trang này.' });
      router.push('/forum');
    }
  }, [isAdmin, router, toast]);

  const load = async () => {
    setLoading(true);
    try {
      console.log('Loading knowledge documents...', { page, pageSize, q });
      const res = await knowledgeAPI.listDocuments(page, pageSize, q || undefined);
      console.log('API Response:', res);

      // Handle both paginated and non-paginated responses
      if (Array.isArray(res)) {
        // Non-paginated: backend returns array directly
        console.log('Non-paginated response, items:', res);
        setItems(res);
        setTotal(res.length);
      } else if (res?.items) {
        // Paginated: backend returns { items, total, page, pageSize }
        console.log('Paginated response, items:', res.items);
        setItems(res.items ?? []);
        setTotal(res.total ?? 0);
      } else {
        console.warn('Unexpected response format:', res);
        setItems([]);
        setTotal(0);
      }
    } catch (e: any) {
      console.error('Error loading documents:', e);
      toast({
        title: 'Lỗi tải danh sách',
        description: e?.message ?? 'Không thể tải tài liệu',
        variant: 'destructive',
      });
      setItems([]);
      setTotal(0);
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
      const body = {
        title: textTitle,
        sourceUrl: textSource || undefined,
        text: textContent,
      };
      const preview = await knowledgeAPI.previewText(body);

      // Nếu không có doc liên quan -> ingest luôn
      if (!preview.relatedDocuments.length) {
        await knowledgeAPI.ingestText(body);
        toast({ title: 'Đã ingest text' });
        setTextTitle('');
        setTextSource('');
        setTextContent('');
        load();
        return;
      }

      // Có doc liên quan -> mở dialog preview
      setPreviewItems([preview]);
      setPendingIngest({ kind: 'text', body });
      setSelectedExistingIds([]);
      toast({
        title: 'Phát hiện tài liệu liên quan',
        description: 'Kiểm tra tài liệu hiện có trước khi ingest.',
      });
    } catch (e: any) {
      toast({
        title: 'Lỗi preview text',
        description: e?.message ?? 'Không thể preview',
        variant: 'destructive',
      });
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
      const body = { url: urlValue, title: urlTitle || undefined };
      const preview = await knowledgeAPI.previewUrl(body);

      if (!preview.relatedDocuments.length) {
        await knowledgeAPI.ingestUrl(body);
        toast({ title: 'Đã ingest URL' });
        setUrlTitle('');
        setUrlValue('');
        load();
        return;
      }

      setPreviewItems([preview]);
      setPendingIngest({ kind: 'url', body });
      setSelectedExistingIds([]);
      toast({
        title: 'Phát hiện tài liệu liên quan',
        description: 'Kiểm tra tài liệu hiện có trước khi ingest.',
      });
    } catch (e: any) {
      toast({
        title: 'Lỗi preview URL',
        description: e?.message ?? 'Không thể preview',
        variant: 'destructive',
      });
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
      const meta = {
        title: filesTitle || undefined,
        sourceUrl: filesSource || undefined,
      };

      const previews = await knowledgeAPI.previewFiles(files, meta);

      const haveRelated = previews.some((p) => p.relatedDocuments.length > 0);
      if (!haveRelated) {
        await knowledgeAPI.ingestFiles(files, meta);
        toast({ title: 'Đã ingest file' });
        setFiles([]);
        setFilesTitle('');
        setFilesSource('');
        const inputEl = document.getElementById('files-input') as HTMLInputElement | null;
        if (inputEl) inputEl.value = '';
        load();
        return;
      }

      setPreviewItems(previews);
      setPendingIngest({ kind: 'files', files, meta });
      setSelectedExistingIds([]);
      toast({
        title: 'Phát hiện tài liệu liên quan',
        description: 'Một số file trùng/ liên quan với tài liệu hiện có.',
      });
    } catch (e: any) {
      toast({
        title: 'Lỗi preview file',
        description: e?.message ?? 'Không thể preview',
        variant: 'destructive',
      });
    } finally {
      setIngestLoading(false);
    }
  };

  const handleDeleteExistingDocuments = async () => {
    if (!selectedExistingIds.length) {
      toast({ title: 'Chưa chọn tài liệu để xoá' });
      return;
    }
    setPreviewActionLoading(true);
    try {
      await Promise.all(selectedExistingIds.map((id) => knowledgeAPI.deleteDocument(id)));
      toast({ title: 'Đã xoá tài liệu cũ đã chọn' });
      load();
    } catch (e: any) {
      toast({
        title: 'Lỗi xoá tài liệu',
        description: e?.message ?? 'Không thể xoá',
        variant: 'destructive',
      });
    } finally {
      setPreviewActionLoading(false);
    }
  };

  const handleConfirmIngestNew = async () => {
    if (!pendingIngest) return;
    setPreviewActionLoading(true);
    try {
      if (pendingIngest.kind === 'text') {
        await knowledgeAPI.ingestText(pendingIngest.body);
        // clear form text
        setTextTitle('');
        setTextSource('');
        setTextContent('');
      } else if (pendingIngest.kind === 'url') {
        await knowledgeAPI.ingestUrl(pendingIngest.body);
        // clear form url
        setUrlTitle('');
        setUrlValue('');
      } else if (pendingIngest.kind === 'files') {
        await knowledgeAPI.ingestFiles(pendingIngest.files, pendingIngest.meta);
        // clear form files
        setFiles([]);
        setFilesTitle('');
        setFilesSource('');
        const inputEl = document.getElementById('files-input') as HTMLInputElement | null;
        if (inputEl) inputEl.value = '';
      }

      toast({ title: 'Đã ingest tài liệu mới' });
      resetPreviewState();
      load();
    } catch (e: any) {
      toast({
        title: 'Lỗi ingest',
        description: e?.message ?? 'Không thể ingest',
        variant: 'destructive',
      });
    } finally {
      setPreviewActionLoading(false);
    }
  };

  const handleCancelNew = () => {
    toast({ title: 'Đã huỷ ingest tài liệu mới' });
    resetPreviewState();
  };

  const openEdit = (doc: KnowledgeDocumentDto) => {
    setEditing(doc);
    setEditTitle(doc.title ?? '');
    setEditMeta(doc.meta ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await knowledgeAPI.updateDocument(editing.id, {
        title: editTitle || null,
        meta: editMeta || null,
      });
      toast({ title: 'Đã cập nhật tài liệu' });
      setEditing(null);
      load();
    } catch (e: any) {
      toast({
        title: 'Lỗi cập nhật',
        description: e?.message ?? 'Không thể cập nhật',
        variant: 'destructive',
      });
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm('Xóa tài liệu này?')) return;
    try {
      await knowledgeAPI.deleteDocument(id);
      toast({ title: 'Đã xóa' });
      load();
    } catch (e: any) {
      toast({
        title: 'Lỗi xóa',
        description: e?.message ?? 'Không thể xóa',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Gộp tất cả related docs của preview để hiển thị bên phải
  const allRelatedDocs: KnowledgeDocumentDto[] = useMemo(() => {
    if (!previewItems) return [];
    const map = new Map<string, KnowledgeDocumentDto>();
    previewItems.forEach((p) => {
      p.relatedDocuments.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, d);
      });
    });
    return Array.from(map.values());
  }, [previewItems]);

  return (
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
                      <Input
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="VD: AWS EC2 notes"
                      />
                    </div>
                    <div>
                      <Label>Source URL (optional)</Label>
                      <Input
                        value={textSource}
                        onChange={(e) => setTextSource(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Text</Label>
                      <Textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        rows={6}
                        placeholder="Dán nội dung..."
                      />
                    </div>
                    <Button onClick={doIngestText} disabled={ingestLoading}>
                      Ingest Text
                    </Button>
                  </TabsContent>

                  <TabsContent value="url" className="space-y-3 pt-4">
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Title (optional)</Label>
                      <Input
                        value={urlTitle}
                        onChange={(e) => setUrlTitle(e.target.value)}
                        placeholder="Tùy chọn tiêu đề"
                      />
                    </div>
                    <Button onClick={doIngestUrl} disabled={ingestLoading}>
                      Ingest URL
                    </Button>
                  </TabsContent>

                  <TabsContent value="files" className="space-y-3 pt-4">
                    <div>
                      <Label>Files</Label>
                      <Input
                        id="files-input"
                        type="file"
                        multiple
                        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Title (optional)</Label>
                        <Input
                          value={filesTitle}
                          onChange={(e) => setFilesTitle(e.target.value)}
                          placeholder="Tên chung cho tài liệu"
                        />
                      </div>
                      <div>
                        <Label>Source URL (optional)</Label>
                        <Input
                          value={filesSource}
                          onChange={(e) => setFilesSource(e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <Button onClick={doIngestFiles} disabled={ingestLoading}>
                      Ingest Files
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* List */}
            <Card>
              <CardHeader className="flex flex-col gap-3">
                <CardTitle>Danh sách tài liệu</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPage(1);
                        load();
                      }
                    }}
                    placeholder="Tìm theo tiêu đề..."
                    className="max-w-xs"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPage(1);
                      load();
                    }}
                  >
                    Tìm
                  </Button>
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
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-8"
                          >
                            Đang tải...
                          </TableCell>
                        </TableRow>
                      ) : (items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground py-8"
                          >
                            Không có tài liệu
                          </TableCell>
                        </TableRow>
                      ) : (
                        (items ?? []).map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.title ?? '(no title)'}</TableCell>
                            <TableCell>
                              {d.sourceUrl ? (
                                <a
                                  className="underline"
                                  href={d.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  link
                                </a>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{d.chunkCount ?? 0}</TableCell>
                            <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                                Sửa
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDoc(d.id)}
                              >
                                Xóa
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">Tổng: {total}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
  
      {/* Preview dialog: tài liệu mới (metadata) + tài liệu liên quan hiện có */}
      <Dialog open={!!previewItems} onOpenChange={(open) => !open && resetPreviewState()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Kiểm tra tài liệu trùng / liên quan</DialogTitle>
          </DialogHeader>

          {previewItems && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Hệ thống phát hiện một số tài liệu hiện có có vẻ trùng hoặc liên quan với tài liệu bạn
                sắp ingest. Bạn có thể xoá bớt tài liệu cũ, huỷ ingest mới hoặc tiếp tục ingest.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trái: tài liệu mới (metadata) */}
                <div>
                  <h3 className="font-semibold mb-2">Tài liệu mới sắp ingest</h3>
                  <div className="rounded-md border max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewItems.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {p.proposedTitle ?? '(no title)'}
                            </TableCell>
                            <TableCell>
                              {p.proposedSourceUrl ? (
                                <a
                                  href={p.proposedSourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  link
                                </a>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Phải: tài liệu liên quan hiện có */}
                <div>
                  <h3 className="font-semibold mb-2">Tài liệu liên quan hiện có</h3>
                  <div className="rounded-md border max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Tiêu đề</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Chunks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRelatedDocs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedExistingIds.includes(doc.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedExistingIds((prev) =>
                                    checked
                                      ? [...prev, doc.id]
                                      : prev.filter((id) => id !== doc.id),
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {doc.title ?? '(no title)'}
                            </TableCell>
                            <TableCell>
                              {doc.sourceUrl ? (
                                <a
                                  href={doc.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline"
                                >
                                  link
                                </a>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>{doc.chunkCount}</TableCell>
                          </TableRow>
                        ))}

                        {!allRelatedDocs.length && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground"
                            >
                              Không có tài liệu liên quan
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  • Tick vào tài liệu cũ để <span className="font-semibold">xoá bớt</span> khỏi hệ thống. <br />
                  • Chọn <span className="font-semibold">Huỷ</span> nếu không muốn ingest tài liệu mới. <br />
                  • Chọn <span className="font-semibold">Tiếp tục ingest</span> nếu chấp nhận.
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteExistingDocuments}
                    disabled={previewActionLoading || !selectedExistingIds.length}
                  >
                    Xoá tài liệu cũ đã chọn
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelNew}
                    disabled={previewActionLoading}
                  >
                    Huỷ ingest tài liệu mới
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmIngestNew}
                    disabled={previewActionLoading}
                  >
                    Tiếp tục ingest tài liệu mới
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <Textarea
                rows={4}
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={saveEdit}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}