'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/hooks/use-toast';

import { postAPI } from '@/lib/api/postAPI';
import { reactionAPI } from '@/lib/api/reactionAPI';
import { materialAPI, type MaterialResponse } from '@/lib/api/materialAPI';
import { commentAPI } from '@/lib/api/commentAPI';
import { userAPI } from '@/lib/api/userAPI';

import type { PostResponseDto, CommentRequestDto } from '@/lib/types';
import { mapPostToUI, type UIPost } from '@/lib/mappers/postMapper';
import { mapUserToPostOwner, type PostOwner } from '@/lib/mappers/postOwnerMapper';

import { useBadgesCatalog, pickPrimaryBadgeByPoints } from '@/hooks/use-badge-catalog';
import { BadgePillFancy } from '@/components/forum/BadgePillFancy';
import { PostStatusBadge } from '@/components/forum/PostStatusBadge';

import {
  mapCommentsToUITree,
  insertReplyIntoTree,
  updateCommentReactionOptimistic,
  type UIComment,
  attachMaterialsToTree
} from '@/lib/mappers/commentMapper';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  Trash2,
  Edit,
  FileText,
  Download,
  ThumbsDown,
  ImagePlus,
  FilePlus2,
  X,
  UploadCloud
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommentCard } from '@/components/forum/CommentCard';
import { CommentSkeleton } from '@/components/ui/skeleton-card';

import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const toHttpUrl = (u: string) => {
  if (!u) return u;
  const trimmed = u.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
};

const getExt = (url: string) => {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() ?? '';
    const qless = last.split('?')[0];
    const dot = qless.lastIndexOf('.');
    return dot >= 0 ? qless.slice(dot).toLowerCase() : '';
  } catch {
    const clean = url.split('?')[0];
    const dot = clean.lastIndexOf('.');
    return dot >= 0 ? clean.slice(dot).toLowerCase() : '';
  }
};
const isImageUrl = (url: string) => {
  const ext = getExt(url);
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return true;
  return /imgbb\.com|i\.ibb\.co|ibb\.co/.test(url);
};

type QueuedImage = { id: string; file: File; preview: string };
type QueuedDoc = { id: string; file: File };
const uid = () => Math.random().toString(36).slice(2);

function PostDetailContent() {
  const { id: postId } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const isGuest = !profile?.id;

  const [loading, setLoading] = useState(true);
  const [rawPost, setRawPost] = useState<PostResponseDto | null>(null);
  const [owner, setOwner] = useState<PostOwner | null>(null);
  const uiPost = useMemo<UIPost | null>(() => (rawPost ? mapPostToUI(rawPost) : null), [rawPost]);

  // Reaction state: dùng 2 counter riêng & 2 flags (post)
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [posCount, setPosCount] = useState(0);
  const [negCount, setNegCount] = useState(0);

  // comments
  const [comments, setComments] = useState<UIComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [userHasScrolled, setUserHasScrolled] = useState(false);

  //comment attachments
  const [cImages, setCImages] = useState<QueuedImage[]>([]);
  const [cDocs, setCDocs] = useState<QueuedDoc[]>([]);
  const [cUploadProgress, setCUploadProgress] = useState(0);

  const searchParams = useSearchParams();
  const targetCommentId = searchParams.get('c') || null;

  // materials
  const [materials, setMaterials] = useState<MaterialResponse[]>([]);
  const images = materials.filter((m) => isImageUrl(m.fileUrl));
  const documents = materials.filter((m) => !isImageUrl(m.fileUrl));

  // preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  // edit post state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [updatingPost, setUpdatingPost] = useState(false);

  // delete post state
  const [deletingPost, setDeletingPost] = useState(false);

  // edit comment state
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [updatingComment, setUpdatingComment] = useState(false);

  // material removal state
  const [removingMaterial, setRemovingMaterial] = useState<string | null>(null);

  function countTree(nodes: UIComment[]): number {
    let total = 0;
    for (const n of nodes) {
      total += 1;
      if (n.children?.length) total += countTree(n.children);
    }
    return total;
  }

  const totalComments = useMemo(() => countTree(comments), [comments]);

  const badges = useBadgesCatalog();
  const primaryBadge = useMemo(
    () =>
      uiPost
        ? uiPost.author.primaryBadge ??
        pickPrimaryBadgeByPoints(badges, uiPost.author.reputation_points ?? 0)
        : null,
    [uiPost, badges]
  );

  const loadPost = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const post = await postAPI.getById(postId);
      setRawPost(post);
      setIsLiked(post.isPositiveReacted === true);
      setIsDisliked(post.isNegativeReacted === true);
      setPosCount(post.positiveReactionCount ?? 0);
      setNegCount(post.negativeReactionCount ?? 0);

      // Check if user can view this post
      const canView = post.status === 'Accepted' ||
                     (profile && (post.authorId === profile.id || profile.role === 'admin'));

      if (!canView) {
        toast({
          title: 'Access Denied',
          description: 'This post is not available.',
          variant: 'destructive'
        });
        router.push('/forum');
        return;
      }

      // Show status notification
      if (post.status === 'Pending') {
        toast({
          title: 'Post Under Review',
          description: 'This post is currently being reviewed by AI.',
          duration: 3000
        });
      } else if (post.status === 'Rejected' && post.rejectReason) {
        toast({
          title: 'Post Rejected',
          description: post.rejectReason,
          variant: 'destructive',
          duration: 5000
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load post', variant: 'destructive' });
      router.push('/forum');
    } finally {
      setLoading(false);
    }
  }, [postId, router, toast, profile]);

  const loadMaterials = useCallback(async () => {
    if (!postId) return;
    try {
      const list = await materialAPI.listByPost(postId);
      setMaterials(list);
    } catch (e) {
      console.error('Failed to load attachments', e);
    }
  }, [postId]);

  
  const loadComments = useCallback(async () => {
    if (!postId) return;

    try {
      console.log('Loading comments for postId:', postId);
      // Get all comments at once
      const flat = await commentAPI.getByPost(postId);
      console.log('Raw comments from API:', flat);

      let tree = mapCommentsToUITree(flat, postId, 2);
      console.log('Comments mapped to tree:', tree);

      // Note: We're not attaching materials here since they belong to the post, not comments
      // If comments have their own materials, they should be loaded separately
      setComments(tree);
    } catch (e) {
      console.error('Failed to load comments', e);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive'
      });
    }
  }, [postId]);

  // Simple scroll handler to track user scrolling
  const handleScroll = useCallback(() => {
    const { scrollTop } = document.documentElement;

    // Mark that user has scrolled
    if (scrollTop > 50) {
      setUserHasScrolled(true);
    }
  }, []);

  // Prevent automatic scroll on page load
  useEffect(() => {
    // Store initial scroll position and prevent automatic scrolling
    const initialScrollY = window.scrollY;

    // Override any potential scroll-to-comments behavior on page load
    const preventAutoScroll = () => {
      if (window.scrollY > initialScrollY + 100) {
        window.scrollTo({
          top: initialScrollY,
          behavior: 'auto'
        });
      }
    };

    // Check for unwanted scrolling immediately and after content loads
    const timeout1 = setTimeout(preventAutoScroll, 100);
    const timeout2 = setTimeout(preventAutoScroll, 300);
    const timeout3 = setTimeout(preventAutoScroll, 800);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, []);

  // Add global scroll event listener with proper cleanup
  useEffect(() => {
    const throttledHandleScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [handleScroll]);

  const loadOwnerInformation = useCallback(async () => {
    if (!postId) return;
    try {
      const user = await userAPI.getById(rawPost?.authorId ?? '');
      const postOwner = mapUserToPostOwner(user);
      setOwner(postOwner);
    } catch (e) {
      console.error('Failed to load post owner information');
    }
  }, [postId, rawPost?.authorId]);

  useEffect(() => {
    loadPost();
    loadMaterials();
    loadComments();
    loadOwnerInformation();
  }, [loadPost, loadMaterials, loadComments, loadOwnerInformation]);

  useEffect(() => {
    if (!targetCommentId) return;

    // Only scroll if user explicitly navigated to a comment URL (from another page)
    // This prevents scrolling on normal page entry
    const hasCommentHash = window.location.hash.includes(`comment-${targetCommentId}`);
    const referrer = document.referrer;
    const sameOrigin = referrer && referrer.startsWith(window.location.origin);
    const isExternalNavigation = referrer && !sameOrigin;

    // Only scroll if:
    // 1. URL has comment hash, OR
    // 2. Coming from external site with comment parameter
    if (!hasCommentHash && !isExternalNavigation) return;

    const t = setTimeout(() => {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-400', 'rounded-md');
        setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400', 'rounded-md'), 1600);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [targetCommentId, comments]);

  type ReactionKind = 'like' | 'dislike';

  function findPath(nodes: UIComment[], id: string, acc: UIComment[] = []): UIComment[] | null {
    for (const n of nodes) {
      const path = [...acc, n];
      if (n.id === id) return path;
      const sub = findPath(n.children ?? [], id, path);
      if (sub) return sub;
    }
    return null;
  }

  const handleReact = async (kind: ReactionKind) => {
    if (!profile?.id || !postId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to react.',
        variant: 'destructive',
      });
      return;
    }

    const currLike = isLiked;
    const currDislike = isDisliked;
    const wantLike = kind === 'like';
    const wantDislike = kind === 'dislike';

    type Action = 'clear' | 'set-like' | 'set-dislike';
    let action: Action;

    if ((currLike && wantLike) || (currDislike && wantDislike)) {
      action = 'clear';
    } else if (wantLike) {
      action = 'set-like';
    } else {
      action = 'set-dislike';
    }

    const snapshot = {
      isLiked: currLike,
      isDisliked: currDislike,
      pos: posCount,
      neg: negCount,
      raw: rawPost,
    };

    // optimistic update
    if (action === 'clear') {
      if (currLike) {
        setIsLiked(false);
        setPosCount((c) => Math.max(0, c - 1));
      } else if (currDislike) {
        setIsDisliked(false);
        setNegCount((c) => Math.max(0, c - 1));
      }
    } else if (action === 'set-like') {
      if (currDislike) {
        setIsDisliked(false);
        setNegCount((c) => Math.max(0, c - 1));
        setIsLiked(true);
        setPosCount((c) => c + 1);
      } else if (!currLike) {
        setIsLiked(true);
        setPosCount((c) => c + 1);
      }
    } else if (action === 'set-dislike') {
      if (currLike) {
        setIsLiked(false);
        setPosCount((c) => Math.max(0, c - 1));
        setIsDisliked(true);
        setNegCount((c) => c + 1);
      } else if (!currDislike) {
        setIsDisliked(true);
        setNegCount((c) => c + 1);
      }
    }

    // sync vào rawPost để uiPost re-map đúng
    setRawPost((p) => {
      if (!p) return p;
      let pos = p.positiveReactionCount ?? 0;
      let neg = p.negativeReactionCount ?? 0;
      let isPos = p.isPositiveReacted;
      let isNeg = p.isNegativeReacted;

      if (action === 'clear') {
        if (isPos) {
          pos = Math.max(0, pos - 1);
          isPos = null;
        } else if (isNeg) {
          neg = Math.max(0, neg - 1);
          isNeg = null;
        }
      } else if (action === 'set-like') {
        if (isNeg) {
          neg = Math.max(0, neg - 1);
          pos = pos + 1;
        } else if (!isPos) {
          pos = pos + 1;
        }
        isPos = true;
        isNeg = false;
      } else if (action === 'set-dislike') {
        if (isPos) {
          pos = Math.max(0, pos - 1);
          neg = neg + 1;
        } else if (!isNeg) {
          neg = neg + 1;
        }
        isPos = false;
        isNeg = true;
      }

      return {
        ...p,
        isPositiveReacted: isPos,
        isNegativeReacted: isNeg,
        positiveReactionCount: pos,
        negativeReactionCount: neg,
      };
    });

    try {
      if (action === 'clear') {
        await reactionAPI.removePost(postId);
        toast({ title: 'Success', description: 'Reaction cleared' });
      } else if (action === 'set-like') {
        await reactionAPI.react({ postId, isPositive: true });
        toast({ title: 'Success', description: 'Liked post' });
      } else {
        await reactionAPI.react({ postId, isPositive: false });
        toast({ title: 'Success', description: 'Disliked post' });
      }
    } catch (e) {
      // revert
      setIsLiked(snapshot.isLiked);
      setIsDisliked(snapshot.isDisliked);
      setPosCount(snapshot.pos);
      setNegCount(snapshot.neg);
      setRawPost(snapshot.raw);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to update reaction', variant: 'destructive' });
    }
  };

  // ===== Post Edit/Delete Functions =====
  const handleEditPost = () => {
    if (!uiPost) return;
    setEditTitle(uiPost.title);
    setEditContent(uiPost.content);
    setIsEditingPost(true);
  };

  const handleUpdatePost = async () => {
    if (!uiPost || !postId) return;
    if (!editTitle.trim()) {
      toast({ title: 'Error', description: 'Title cannot be empty', variant: 'destructive' });
      return;
    }

    setUpdatingPost(true);
    try {
      await postAPI.update(postId, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });

      // Update local state
      setRawPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          title: editTitle.trim(),
          content: editContent.trim(),
        };
      });

      setIsEditingPost(false);
      toast({ title: 'Success', description: 'Post updated successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update post', variant: 'destructive' });
    } finally {
      setUpdatingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;

    setDeletingPost(true);
    try {
      await postAPI.delete(postId);
      toast({ title: 'Success', description: 'Post deleted successfully' });
      router.push('/forum');
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
    } finally {
      setDeletingPost(false);
    }
  };

  // ===== Comment Edit/Delete Functions =====
  const handleEditComment = (commentId: string) => {
    const comment = findComment(comments, commentId);
    if (!comment) return;
    setEditCommentContent(comment.content);
    setEditingComment(commentId);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) {
      toast({ title: 'Error', description: 'Comment cannot be empty', variant: 'destructive' });
      return;
    }

    setUpdatingComment(true);
    try {
      await commentAPI.update(commentId, {
        content: editCommentContent.trim(),
      });

      // Update local state
      setComments((prev) => {
        const clone = structuredClone(prev) as UIComment[];
        const stack = [...clone];
        while (stack.length) {
          const node = stack.pop()!;
          if (node.id === commentId) {
            node.content = editCommentContent.trim();
            break;
          }
          if (node.children?.length) stack.push(...node.children);
        }
        return clone;
      });

      setEditingComment(null);
      setEditCommentContent('');
      toast({ title: 'Success', description: 'Comment updated successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update comment', variant: 'destructive' });
    } finally {
      setUpdatingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentAPI.delete(commentId);

      // Update local state - remove the comment and its children
      setComments((prev) => {
        const clone = structuredClone(prev) as UIComment[];

        const removeNode = (nodes: UIComment[]): UIComment[] => {
          return nodes.filter(node => {
            if (node.id === commentId) {
              return false; // Remove this node and all its children
            }
            if (node.children) {
              node.children = removeNode(node.children);
            }
            return true;
          });
        };

        return removeNode(clone);
      });

      toast({ title: 'Success', description: 'Comment deleted successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  // ===== Material Removal Function =====
  const handleRemoveMaterial = async (materialId: string) => {
    if (!postId) return;

    setRemovingMaterial(materialId);
    try {
      await materialAPI.delete(materialId);

      // Update local state
      setMaterials((prev) => prev.filter(m => m.id !== materialId));

      toast({ title: 'Success', description: 'Material removed successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to remove material', variant: 'destructive' });
    } finally {
      setRemovingMaterial(null);
    }
  };

  // ===== Comments =====

  function findComment(nodes: UIComment[], id: string): UIComment | undefined {
    for (const n of nodes) {
      if (n.id === id) return n;
      const sub = findComment(n.children ?? [], id);
      if (sub) return sub;
    }
    return undefined;
  }

  const onPickCImages = (files: FileList | null) => {
    if (!files) return;
    const accepted = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    const next = accepted.map((f) => ({ id: uid(), file: f, preview: URL.createObjectURL(f) }));
    setCImages((p) => [...p, ...next]);
    if (accepted.length !== files.length) {
      toast({ title: 'Some images were skipped', description: 'Only JPG, PNG, WEBP', variant: 'destructive' });
    }
  };
  const onPickCDocs = (files: FileList | null) => {
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
    setCDocs((p) => [...p, ...next]);
    if (accepted.length !== files.length) {
      toast({ title: 'Some files were skipped', description: 'Unsupported type', variant: 'destructive' });
    }
  };
  const removeCImage = (id: string) => {
    setCImages((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.preview);
      return prev.filter((x) => x.id !== id);
    });
  };
  const removeCDoc = (id: string) => setCDocs((p) => p.filter((x) => x.id !== id));


  const handleSubmitComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile?.id || !postId || !newComment.trim()) {
      toast({ title: 'Sign in required', description: 'Please sign in to comment.', variant: 'destructive' });
      return;
    }
    setSubmittingComment(true);
    setCUploadProgress(0);

    try {
      const payload: CommentRequestDto = {
        postId,
        content: newComment.trim(),
        parentCommentId: null,
      };
      const created = await commentAPI.create(payload);

      // Upload attachments (theo từng file) -> { commentId }
      const totalFiles = cImages.length + cDocs.length;
      if (totalFiles > 0) {
        let done = 0;
        const tick = () => {
          done += 1;
          setCUploadProgress(Math.round((done / totalFiles) * 100));
        };

        await Promise.all(
          cImages.map(async (img) => {
            try {
              await materialAPI.uploadImage(img.file, {
                commentId: created.id,
                title: img.file.name,
                description: 'image',
              });
            } finally {
              tick();
            }
          })
        );

        await Promise.all(
          cDocs.map(async (d) => {
            try {
              await materialAPI.uploadDocuments([d.file], {
                commentId: created.id,
                title: d.file.name,
                description: 'document',
              });
            } finally {
              tick();
            }
          })
        );
      }

      await loadComments(); // Reload comments after new comment

      cImages.forEach((i) => URL.revokeObjectURL(i.preview));
      setCImages([]); setCDocs([]); setCUploadProgress(0);
      setNewComment('');
      toast({ title: 'Success', description: 'Comment posted successfully' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to post comment.', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitReply = async (parentId: string, content: string, images: File[] = [], docs: File[] = []) => {
    if (!profile?.id || !postId) {
      toast({ title: 'Sign in required', description: 'Please sign in to reply.', variant: 'destructive' });
      return;
    }
    const text = content.trim();
    if (!text) return;

    // Xác định parent theo path để tránh sai khi reply sâu
    const path = findPath(comments, parentId);
    if (!path) return;
    const MAX_PARENT_DEPTH = 1;
    const effectiveParentId = path[Math.min(MAX_PARENT_DEPTH, path.length - 1)].id;

    try {
      // 1) Tạo comment ở backend
      const created = await commentAPI.create({
        postId,
        content: text,
        parentCommentId: effectiveParentId,
      });

      // 2) HYDRATE ngay dữ liệu thiếu để hiển thị không bị "unknown"
      const hydrated = {
        id: created.id,
        content: text,
        authorId: profile.id,
        authorUsername: profile.fullName || profile.username || 'You',
        authorAvatarUrl: profile.avatarUrl ?? null,
        authorPoint: profile.point ?? 0,
        createdAt: created.createdAt ?? new Date().toISOString(),
        replies: [],
        isPositiveReacted: null,
        isNegativeReacted: null,
        positiveReactionCount: 0,
        negativeReactionCount: 0,
      };

      // 3) Chèn vào UI tree ngay (optimistic)
      setComments((prev) => insertReplyIntoTree(prev, effectiveParentId, hydrated, 2));

      // 4) Upload files → gom lại materials trả về để gắn ngay cho comment mới
      const uploadedImgs = await Promise.allSettled(
        images.map((f) => materialAPI.uploadImage(f, { commentId: created.id, title: f.name, description: 'image' }))
      );
      const uploadedDocs = await Promise.allSettled(
        docs.map((f) => materialAPI.uploadDocuments([f], { commentId: created.id, title: f.name, description: 'document' }))
      );

      // Chuẩn hoá danh sách MaterialResponse từ kết quả (tùy API của bạn trả 1 hay mảng)
      const flatFromSettled = (arr: PromiseSettledResult<any>[]) =>
        arr
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .flatMap((r) => (Array.isArray(r.value) ? r.value : [r.value]))
          .filter(Boolean);

      const newMats = [...flatFromSettled(uploadedImgs), ...flatFromSettled(uploadedDocs)] as MaterialResponse[];

      if (newMats.length > 0) {
        setComments((prev) => {
          // gắn materials vào đúng comment vừa tạo
          const clone = structuredClone(prev) as UIComment[];
          const stack = [...clone];
          while (stack.length) {
            const node = stack.pop()!;
            if (node.id === created.id) {
              node.materials = [...(node.materials ?? []), ...newMats];
              break;
            }
            if (node.children?.length) stack.push(...node.children);
          }
          return clone;
        });
      }

      toast({ title: 'Success', description: 'Reply posted successfully' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to post reply.', variant: 'destructive' });
    }
  };

  const handleCommentReact = async (commentId: string, kind: ReactionKind) => {
    if (!profile?.id) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to react on comments.',
        variant: 'destructive',
      });
      return;
    }

    const target = findComment(comments, commentId);
    if (!target) return;

    const currPos = target.isPositiveReacted === true;
    const currNeg = target.isNegativeReacted === true;
    const wantPos = kind === 'like';
    const wantNeg = kind === 'dislike';

    type Action = 'clear' | 'set-like' | 'set-dislike';
    let action: Action;
    if ((currPos && wantPos) || (currNeg && wantNeg)) {
      action = 'clear';
    } else if (wantPos) {
      action = 'set-like';
    } else {
      action = 'set-dislike';
    }

    const snapshot = comments;
    setComments((prev) => updateCommentReactionOptimistic(prev, commentId, action));

    try {
      if (action === 'clear') {
        await reactionAPI.removeComment(commentId);
        toast({ title: 'Success', description: 'Reaction cleared' });
      } else if (action === 'set-like') {
        await reactionAPI.react({ commentId, isPositive: true });
        toast({ title: 'Success', description: 'Comment liked' });
      } else {
        await reactionAPI.react({ commentId, isPositive: false });
        toast({ title: 'Success', description: 'Comment disliked' });
      }
    } catch (e) {
      setComments(snapshot);
      console.error(e);
      toast({ title: 'Error', description: 'Failed to update comment reaction', variant: 'destructive' });
    }
  };

  if (loading || !uiPost) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-muted-foreground">Loading post...</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Fetching post details</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="icon" onClick={() => router.back()}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={uiPost.author.avatar_url ?? undefined}
                alt={uiPost.author.full_name}
              />
              <AvatarFallback>
                {uiPost.author.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <Link
                href={`/profile/${uiPost.author.id}`}
                className="font-medium hover:underline block truncate"
              >
                {uiPost.author.full_name}
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <BadgePillFancy badge={primaryBadge} />
                <PostStatusBadge
                  status={uiPost.status}
                  rejectReason={uiPost.rejectReason}
                  aiReason={uiPost.aiReason}
                />
                <span>
                  {formatDistanceToNow(new Date(uiPost.created_at), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                </span>
                {uiPost.reviewedAt && (
                  <span>
                    • Reviewed {formatDistanceToNow(new Date(uiPost.reviewedAt), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile?.id === uiPost.author_id && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleEditPost}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeletePost}
                disabled={deletingPost}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deletingPost ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{uiPost.title}</h1>

            {/* tags */}
            {uiPost.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uiPost.tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    style={t.color ? { borderColor: t.color, color: t.color } : {}}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {uiPost.content}
          </p>

          {/* Attachments */}
          {(images.length > 0 || documents.length > 0) && (
            <div className="space-y-4">
              <Separator />
              <h3 className="font-semibold">Tập tin đính kèm</h3>

              {/* Images */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <div key={img.id} className="relative group">
                      <button
                        type="button"
                        className="relative aspect-square overflow-hidden rounded-lg border hover:opacity-90 w-full"
                        onClick={() => openPreview(img.fileUrl)}
                        title={img.title}
                      >
                        <img
                          src={img.fileUrl}
                          alt={img.title}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      </button>
                      {/* Delete button for post owner */}
                      {profile?.id === uiPost.author_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMaterial(img.id)}
                          disabled={removingMaterial === img.id}
                          title="Remove image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{doc.title || doc.fileUrl}</span>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <a
                          href={toHttpUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex items-center gap-2 text-sm underline-offset-2 hover:underline"
                          title="Open / Download"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                        {/* Delete button for post owner */}
                        {profile?.id === uiPost.author_id && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleRemoveMaterial(doc.id)}
                            disabled={removingMaterial === doc.id}
                            title="Remove document"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* actions (post) */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReact('like')}
              className={isLiked ? 'text-red-500' : ''}
              title={isGuest ? 'Sign in to like' : (isLiked ? 'Unlike' : 'Like')}
              disabled={isGuest}
            >
              <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-red-500' : ''}`} />
              {posCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReact('dislike')}
              className={isDisliked ? 'text-blue-500' : ''}
              title={isGuest ? 'Sign in to dislike' : (isDisliked ? 'Clear dislike' : 'Dislike')}
              disabled={isGuest}
            >
              <ThumbsDown className={`mr-2 h-4 w-4 ${isDisliked ? 'fill-blue-500' : ''}`} />
              {negCount}
            </Button>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{uiPost.comments_count}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Post Dialog */}
      <Dialog open={isEditingPost} onOpenChange={setIsEditingPost}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full mt-1"
                rows={6}
                placeholder="Post content"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditingPost(false)}
                disabled={updatingPost}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePost}
                disabled={updatingPost || !editTitle.trim()}
              >
                {updatingPost ? 'Updating...' : 'Update Post'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Comments */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Bình Luận</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {isGuest ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Hãy <Link href="/auth/login" className="underline">đăng nhập</Link> để bình luận.
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <div className="relative">
                <Textarea
                  placeholder="Comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submittingComment}
                  rows={3}
                  className="pr-20"
                />

                <input
                  id="c-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickCImages(e.target.files)}
                  disabled={submittingComment}
                />
                <input
                  id="c-doc-input"
                  type="file"
                  accept=".pdf,.docx,.xlsx,.pptx,.zip,.rar,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/vnd.rar,application/x-rar-compressed"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickCDocs(e.target.files)}
                  disabled={submittingComment}
                />

                {/* 2 icon ở góc phải-dưới */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Attach document"
                    onClick={() => document.getElementById('c-doc-input')?.click()}
                    disabled={submittingComment}
                  >
                    <FilePlus2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Attach image"
                    onClick={() => document.getElementById('c-image-input')?.click()}
                    disabled={submittingComment}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Previews gọn */}
              {(cImages.length > 0 || cDocs.length > 0) && (
                <div className="space-y-2">
                  {cImages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {cImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative w-20 h-20 rounded-md overflow-hidden border shrink-0"
                          title={img.file.name}
                        >
                          <img src={img.preview} className="object-cover w-full h-full" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 border"
                            onClick={() => removeCImage(img.id)}
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {cDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {cDocs.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
                          title={d.file.name}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span className="max-w-[220px] truncate">{d.file.name}</span>
                          <button
                            type="button"
                            className="ml-1"
                            onClick={() => removeCDoc(d.id)}
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

              {/* Progress khi đang submit + có files */}
              {submittingComment && (cImages.length + cDocs.length) > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Uploading attachments…</span>
                    <span className="text-xs">{cUploadProgress}%</span>
                  </div>
                  <Progress value={cUploadProgress} />
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={submittingComment || !newComment.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  {submittingComment ? 'Đang đăng...' : 'Đăng Comment'}
                </Button>
              </div>
            </form>
          )}

          <Separator />

          <div className="space-y-4" data-comments-container>
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Chưa có comment nào!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} id={`comment-${c.id}`}>
                  <CommentCard
                    comment={c}
                    canReact={!isGuest}
                    canReply={!isGuest}
                    onLike={(id) => handleCommentReact(id, 'like')}
                    onDislike={(id) => handleCommentReact(id, 'dislike')}
                    onSubmitReply={(parentId, content, imgs, docs) =>
                      handleSubmitReply(parentId, content, imgs, docs)
                    }
                    onPreview={openPreview}
                    canEdit={profile?.id === c.author.id}
                    onEdit={handleEditComment}
                    onUpdate={handleUpdateComment}
                    onDelete={handleDeleteComment}
                    editingComment={editingComment}
                    editCommentContent={editCommentContent}
                    setEditCommentContent={setEditCommentContent}
                    updatingComment={updatingComment}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PostDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PostDetailContent />
    </Suspense>
  );
}