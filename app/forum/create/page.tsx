'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { postAPI } from '@/lib/api/postAPI';
import { categoryAPI } from '@/lib/api/categoryAPI';
import { materialAPI } from '@/lib/api/materialAPI';

import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ImagePlus, FilePlus2, FileText, Trash2, UploadCloud, ArrowLeft, Eye } from 'lucide-react';

import type { PostRequestDto } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RejectedPostDialog } from '@/components/ui/rejected-post-dialog';

type UICategory = { id: string; name: string };
type QueuedImage = { id: string; file: File; preview: string };
type QueuedDoc = { id: string; file: File };

const uid = () => Math.random().toString(36).slice(2);

export default function CreatePostPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<UICategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isQuestionOverride, setIsQuestionOverride] = useState<boolean | null>(null);

  const [images, setImages] = useState<QueuedImage[]>([]);
  const [docs, setDocs] = useState<QueuedDoc[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [rejectedPostDialog, setRejectedPostDialog] = useState<{
    open: boolean;
    post: any;
  }>({ open: false, post: null });

  const derivedIsQuestion = title.trim().endsWith('?');
  const isQuestion = isQuestionOverride ?? derivedIsQuestion;

  useEffect(() => {
    (async () => {
      try {
        const list = await categoryAPI.getAll();
        setCategories([...list].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        console.warn('Failed to load categories:', e);
      }
    })();

    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const toggleCategory = (id: string, checked: boolean) => {
    setSelectedCategoryIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const onPickImages = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    const next = accepted.map((f) => ({ id: uid(), file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...next]);
    if (accepted.length !== files.length) {
      toast({
        title: 'Some images were skipped',
        description: 'Only JPG, PNG, WEBP are allowed.',
        variant: 'destructive',
      });
    }
  };

  const onPickDocs = (files: FileList | null) => {
    if (!files) return;
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/vnd.rar',
      'application/x-rar-compressed',
    ];
    const accepted = Array.from(files).filter((f) => allowed.includes(f.type) || f.name.endsWith('.rar'));
    const next = accepted.map((f) => ({ id: uid(), file: f }));
    setDocs((prev) => [...prev, ...next]);
    if (accepted.length !== files.length) {
      toast({ title: 'Some files were skipped', description: 'Unsupported document type.', variant: 'destructive' });
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((x) => x.id !== id);
    });
  };
  const removeDoc = (id: string) => setDocs((prev) => prev.filter((x) => x.id !== id));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile) {
      toast({ title: 'Sign in required', description: 'Please sign in to create a post.', variant: 'destructive' });
      router.push('/auth/login');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    const payload: PostRequestDto = {
      title: title.trim(),
      content: content.trim(),
      isQuestion,
      categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
    };

    setLoading(true);
    setUploadProgress(0);

    try {
      const created = await postAPI.create(payload);
      const postId = created.id as string;

      const totalFiles = images.length + docs.length;
      if (totalFiles > 0) {
        let done = 0;
        const tick = () => {
          done += 1;
          setUploadProgress(Math.round((done / totalFiles) * 100));
        };

        await Promise.all(
          images.map(async (img) => {
            try {
              await materialAPI.uploadImage(img.file, {
                postId,
                title: img.file.name,
                description: 'image',
              });
            } catch (e) {
              console.error('upload image failed', e);
              toast({ title: 'Image upload failed', description: img.file.name, variant: 'destructive' });
            } finally {
              tick();
            }
          })
        );

        if (docs.length > 0) {
          try {
            // upload từng file để title = tên file
            await Promise.all(
              docs.map(async (d) => {
                try {
                  await materialAPI.uploadDocuments(
                    [d.file],                                 
                    { postId, title: d.file.name, description: 'document' }
                  );
                } catch (err) {
                  console.error('upload document failed', d.file.name, err);
                  toast({
                    title: 'Document upload failed',
                    description: d.file.name,
                    variant: 'destructive',
                  });
                } finally {
                  tick(); // cập nhật progress cho mỗi file
                }
              })
            );
          } catch (e) {
            // phòng hờ Promise.all lỗi tổng
            console.error('upload documents failed', e);
            toast({
              title: 'Document upload failed',
              description: 'Some files could not be uploaded.',
              variant: 'destructive',
            });
          }
        }
      }

      // Show appropriate message based on AI review status
      if (created.status === 'Accepted') {
        toast({ title: 'Success', description: 'Post published successfully' });
      } else if (created.status === 'Pending') {
        toast({
          title: 'Post submitted for review',
          description: 'Your post is being reviewed by AI and will be published soon.',
          duration: 5000
        });
      } else if (created.status === 'Rejected') {
        // Show the rejection dialog instead of redirecting
        setRejectedPostDialog({
          open: true,
          post: created
        });
        return; // Don't redirect, let user handle from dialog
      }
      router.push(`/forum/${postId}`);
    } catch (error) {
      console.error('Failed to create post', error);
      toast({ title: 'Error', description: 'Failed to create post.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/forum">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Post</h1>
          <p className="text-muted-foreground">Share your thoughts with the community</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
          <CardDescription>Write a clear title and detailed content to engage the community</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What's your question or topic?"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (isQuestionOverride === null) { /* no-op */ }
                }}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                {derivedIsQuestion ? 'Detected as a question (ends with “?”)' : 'Not a question'}
              </p>
            </div>


            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Provide details, context, or your perspective..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                disabled={loading}
                rows={10}
                className="resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isQuestion"
                checked={isQuestion}
                onCheckedChange={(val) => setIsQuestionOverride(Boolean(val))}
                disabled={loading}
              />
              <Label htmlFor="isQuestion">Mark as question</Label>
              <span className="text-xs text-muted-foreground ml-2">(auto: {derivedIsQuestion ? 'Yes' : 'No'})</span>
            </div>

            <div className="space-y-2">
              <Label>Categories (Optional)</Label>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">No categories available</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer">
                      <Checkbox
                        checked={selectedCategoryIds.includes(c.id)}
                        onCheckedChange={(checked) => toggleCategory(c.id, Boolean(checked))}
                        disabled={loading}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Attachments (Optional)</Label>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onPickImages(e.dataTransfer.files);
                }}
                className="rounded-2xl border-2 border-dashed p-6 hover:bg-muted/40 transition cursor-pointer"
                onClick={() => document.getElementById('image-input')?.click()}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full border">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Add images</div>
                    <div className="text-sm text-muted-foreground">
                      Drag & drop or click to select (JPG, PNG, WEBP)
                    </div>
                  </div>
                  <Button type="button" variant="secondary" disabled={loading}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <input
                  id="image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickImages(e.target.files)}
                />
                {images.length > 0 && (
                  <ScrollArea className="mt-4 h-32">
                    <div className="flex gap-3">
                      {images.map((img) => (
                        <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                          <img src={img.preview} alt={img.file.name} className="object-cover w-full h-full" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-background/90 rounded-full p-1 border"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(img.id);
                            }}
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onPickDocs(e.dataTransfer.files);
                }}
                className="rounded-2xl border-2 border-dashed p-6 hover:bg-muted/40 transition cursor-pointer"
                onClick={() => document.getElementById('doc-input')?.click()}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full border">
                    <FilePlus2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Add documents</div>
                    <div className="text-sm text-muted-foreground">
                      Drag & drop or click (PDF, DOCX, XLSX, PPTX, ZIP, RAR)
                    </div>
                  </div>
                  <Button type="button" variant="secondary" disabled={loading}>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                <input
                  id="doc-input"
                  type="file"
                  accept=".pdf,.docx,.xlsx,.pptx,.zip,.rar,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/vnd.rar,application/x-rar-compressed"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickDocs(e.target.files)}
                />
                {docs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {docs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm truncate max-w-[220px]">{d.file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(d.file.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeDoc(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {loading && (images.length + docs.length) > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Uploading attachments…</span>
                    <span className="text-sm">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Link href="/forum">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Rejected Post Dialog */}
      {rejectedPostDialog.post && (
        <RejectedPostDialog
          open={rejectedPostDialog.open}
          onClose={() => {
            setRejectedPostDialog({ open: false, post: null });
            // After closing dialog, redirect to forum
            router.push('/forum');
          }}
          post={rejectedPostDialog.post}
        />
      )}
    </div>
  );
}