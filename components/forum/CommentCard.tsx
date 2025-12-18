'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Heart, ThumbsDown, Send, ImagePlus, FilePlus2, FileText, X, Trophy, Medal, Gem, Edit, Trash2, Flag } from 'lucide-react';

import type { UIComment } from '@/lib/mappers/commentMapper';

import { useBadgesCatalog, pickPrimaryBadgeByPoints } from '@/hooks/use-badge-catalog';
import { useLanguage } from '@/context/LanguageContext';
import { ReportDialog } from '@/components/report/ReportDialog';

type QueuedImage = { id: string; file: File; preview: string };
type QueuedDoc = { id: string; file: File };
const uid = () => Math.random().toString(36).slice(2);

interface CommentCardProps {
  comment: UIComment;
  onLike?: (id: string) => void;
  onDislike?: (id: string) => void;
  onSubmitReply?: (
    parentId: string,
    content: string,
    images: File[],
    docs: File[]
  ) => Promise<void> | void;
  canReply?: boolean;
  canReact?: boolean;
  showChildren?: boolean;
  onPreview?: (url: string) => void;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
  onUpdate?: (id: string) => void;
  onDelete?: (id: string) => void;
  editingComment?: string | null;
  setEditingComment?: (id: string | null) => void;
  editCommentContent?: string;
  setEditCommentContent?: (content: string) => void;
  updatingComment?: boolean;
}

type PrimaryBadge = {
  id: string;
  name: string;
  point: number;
  description?: string | null;
};

const classifyBadgeTier = (point: number) => {
  if (point >= 1000) return 'diamond';
  if (point >= 500) return 'platinum';
  if (point >= 250) return 'gold';
  if (point >= 100) return 'silver';
  return 'bronze';
};

function BadgePillFancy({ badge }: { badge?: PrimaryBadge | null }) {
  if (!badge) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground"
        title="Chưa có huy hiệu"
      >
        No badge
      </span>
    );
  }

  const tier = classifyBadgeTier(badge.point ?? 0);

  const tierStyles: Record<
    string,
    { wrap: string; iconWrap: string; icon: string; text: string; Icon: any }
  > = {
    bronze: {
      wrap:
        'bg-gradient-to-br from-amber-200/70 to-amber-300/60 dark:from-amber-900/30 dark:to-amber-700/40 border-amber-300/60 dark:border-amber-800/60 shadow-sm',
      iconWrap: 'bg-amber-500/90',
      icon: 'text-amber-50',
      text: 'text-amber-900 dark:text-amber-100',
      Icon: Medal,
    },
    silver: {
      wrap:
        'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-600/50 border-slate-300/70 dark:border-slate-500/60 shadow',
      iconWrap: 'bg-slate-300',
      icon: 'text-slate-900',
      text: 'text-slate-900 dark:text-slate-100',
      Icon: Medal,
    },
    gold: {
      wrap:
        'bg-gradient-to-br from-yellow-200 to-yellow-300 dark:from-yellow-900/30 dark:to-yellow-700/40 border-yellow-400/70 dark:border-yellow-700/70 shadow-md',
      iconWrap: 'bg-yellow-400',
      icon: 'text-yellow-950',
      text: 'text-yellow-900 dark:text-yellow-100',
      Icon: Trophy,
    },
    platinum: {
      wrap:
        'bg-gradient-to-br from-violet-200/70 via-fuchsia-200/70 to-pink-200/70 dark:from-violet-800/40 dark:via-fuchsia-800/40 dark:to-pink-800/40 border-fuchsia-300/60 dark:border-fuchsia-700/60 shadow-lg animate-pulse',
      iconWrap: 'bg-fuchsia-400',
      icon: 'text-fuchsia-50',
      text: 'text-fuchsia-900 dark:text-fuchsia-100',
      Icon: Trophy,
    },
    diamond: {
      wrap:
        'bg-gradient-to-br from-cyan-200 via-blue-200 to-indigo-200 dark:from-cyan-900/40 dark:via-blue-900/40 dark:to-indigo-900/40 border-cyan-300/70 dark:border-cyan-700/60 shadow-xl ring-1 ring-cyan-400/50 dark:ring-cyan-300/30 animate-pulse',
      iconWrap: 'bg-cyan-400',
      icon: 'text-white',
      text: 'text-cyan-900 dark:text-cyan-100',
      Icon: Gem,
    },
  };

  const s = tierStyles[tier] ?? tierStyles.bronze;
  const IconEl = s.Icon;

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
        'backdrop-blur-[1px]',
        s.wrap,
      ].join(' ')}
      title={badge.description || badge.name}
    >
      <span
        className={`mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full ${s.iconWrap}`}
        aria-hidden
      >
        <IconEl className={`h-3 w-3 ${s.icon}`} />
      </span>
      <span className={s.text}>{badge.name}</span>
    </span>
  );
}

export function CommentCard({
  comment,
  onLike,
  onDislike,
  onSubmitReply,
  canReply = true,
  canReact = true,
  showChildren = true,
  onPreview,
  canEdit = false,
  onEdit,
  onUpdate,
  onDelete,
  editingComment,
  setEditingComment,
  editCommentContent = '',
  setEditCommentContent,
  updatingComment = false,
}: CommentCardProps) {
  const { locale } = useLanguage();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const [images, setImages] = useState<QueuedImage[]>([]);
  const [docs, setDocs] = useState<QueuedDoc[]>([]);

  const liked = comment.isPositiveReacted === true;
  const disliked = comment.isNegativeReacted === true;

  const badgesCatalog = useBadgesCatalog();

  const authorPoints =
    (comment.author as any).reputation_points ?? 0;

  const primary = pickPrimaryBadgeByPoints(badgesCatalog, authorPoints);

  const onPickImages = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    const next = accepted.map((f) => ({
      id: uid(),
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...next]);
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
    const accepted = Array.from(files).filter(
      (f) => allowed.includes(f.type) || f.name.endsWith('.rar')
    );
    const next = accepted.map((f) => ({ id: uid(), file: f }));
    setDocs((prev) => [...prev, ...next]);
  };
  const removeImage = (id: string) => {
    setImages((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.preview);
      return prev.filter((x) => x.id !== id);
    });
  };
  const removeDoc = (id: string) => setDocs((prev) => prev.filter((x) => x.id !== id));

  const handleSend = async () => {
    const content = replyText.trim();
    if (!content || !onSubmitReply) return;
    const imageFiles = images.map((i) => i.file);
    const docFiles = docs.map((d) => d.file);
    await onSubmitReply(comment.id, content, imageFiles, docFiles);
    // reset local
    setReplyText('');
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
    setDocs([]);
    setReplyOpen(false);
  };

  return (
    <div
      id={`comment-${comment.id}`}
      data-comment-id={comment.id}
      className="space-y-2 scroll-mt-24"
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatar_url ?? undefined} />
          <AvatarFallback>
            {(comment.author.full_name || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Card className="bg-slate-50 dark:bg-slate-900">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/profile/${comment.author.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {comment.author.full_name}
                </Link>

                <BadgePillFancy badge={primary as any} />

                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                </span>
              </div>

              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editCommentContent || ''}
                    onChange={(e) => setEditCommentContent?.(e.target.value)}
                    rows={3}
                    className="w-full"
                    placeholder="Edit comment..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingComment?.(null);
                        setEditCommentContent?.('');
                      }}
                      disabled={updatingComment}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onUpdate?.(comment.id)}
                      disabled={updatingComment || !(editCommentContent || '').trim()}
                    >
                      {updatingComment ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              )}

              {(comment.images?.length || comment.documents?.length) ? (
                <div className="mt-3 space-y-3">
                  {comment.images && comment.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {comment.images.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          className="relative aspect-square overflow-hidden rounded-lg border hover:opacity-90"
                          onClick={() => onPreview?.(img.fileUrl)}
                          title={img.title}
                        >
                          <img
                            src={img.fileUrl}
                            alt={img.title}
                            className="object-cover w-full h-full"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {comment.documents && comment.documents.length > 0 && (
                    <div className="space-y-2">
                      {comment.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{doc.title || doc.fileUrl}</span>
                          </div>
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="text-sm underline hover:opacity-80"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {canReact && (
                  <button
                    type="button"
                    onClick={() => onLike?.(comment.id)}
                    className={`inline-flex items-center gap-1 hover:text-foreground transition ${liked ? 'text-red-500' : ''
                      }`}
                    title={liked ? 'Unlike' : 'Like'}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-red-500' : ''}`} />
                    <span>{comment.positiveReactionCount}</span>
                  </button>
                )}

                {canReact && (
                  <button
                    type="button"
                    onClick={() => onDislike?.(comment.id)}
                    className={`inline-flex items-center gap-1 hover:text-foreground transition ${disliked ? 'text-blue-500' : ''
                      }`}
                    title={disliked ? 'Clear dislike' : 'Dislike'}
                  >
                    <ThumbsDown className={`h-3.5 w-3.5 ${disliked ? 'fill-blue-500' : ''}`} />
                    <span>{comment.negativeReactionCount}</span>
                  </button>
                )}

                {canReply && comment.depth <= 2 && (
                  <button
                    type="button"
                    onClick={() => setReplyOpen((s) => !s)}
                    className="hover:text-foreground transition"
                  >
                    Reply
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit?.(comment.id)}
                    className="hover:text-foreground transition"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete?.(comment.id)}
                    className="hover:text-red-500 transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {canReact && (
                  <ReportDialog
                    type="comment"
                    id={comment.id}
                    trigger={
                      <button
                        type="button"
                        className="hover:text-foreground transition"
                        title="Report"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    }
                  />
                )}
              </div>

              {canReply && comment.depth <= 2 && replyOpen && onSubmitReply && (
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <Textarea
                      placeholder="Reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      className="pr-20"
                    />

                    <input
                      id={`reply-img-${comment.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => onPickImages(e.target.files)}
                    />
                    <input
                      id={`reply-doc-${comment.id}`}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.pptx,.zip,.rar,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/vnd.rar,application/x-rar-compressed"
                      multiple
                      className="hidden"
                      onChange={(e) => onPickDocs(e.target.files)}
                    />

                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Attach document"
                        onClick={() =>
                          document.getElementById(`reply-doc-${comment.id}`)?.click()
                        }
                      >
                        <FilePlus2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Attach image"
                        onClick={() =>
                          document.getElementById(`reply-img-${comment.id}`)?.click()
                        }
                      >
                        <ImagePlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(images.length > 0 || docs.length > 0) && (
                    <div className="space-y-2">
                      {images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {images.map((img) => (
                            <div
                              key={img.id}
                              className="relative w-16 h-16 rounded-md overflow-hidden border shrink-0"
                              title={img.file.name}
                            >
                              <img src={img.preview} className="object-cover w-full h-full" />
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 border"
                                onClick={() => removeImage(img.id)}
                                aria-label="Remove image"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {docs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {docs.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
                              title={d.file.name}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="max-w-[180px] truncate">{d.file.name}</span>
                              <button
                                type="button"
                                className="ml-1"
                                onClick={() => removeDoc(d.id)}
                                aria-label="Remove document"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSend} disabled={!replyText.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      Reply
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {showChildren && comment.children?.length > 0 && (
            <div className="pl-6 mt-2 space-y-3">
              {comment.children.map((child) => (
                <CommentCard
                  key={child.id}
                  comment={child}
                  onLike={onLike}
                  onDislike={onDislike}
                  onSubmitReply={onSubmitReply}
                  canReply={canReply}
                  canReact={canReact}
                  showChildren={showChildren}
                  onPreview={onPreview}
                  canEdit={child.author.id === comment.author.id ? canEdit : false}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  editingComment={editingComment}
                  setEditingComment={setEditingComment}
                  editCommentContent={editCommentContent}
                  setEditCommentContent={setEditCommentContent}
                  updatingComment={updatingComment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
