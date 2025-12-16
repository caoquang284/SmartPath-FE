import type { CommentResponseDto } from '@/lib/types';
import type { MaterialResponse } from '../api/materialAPI';

const isImageUrl = (url: string) => {
  const clean = url.split('?')[0].toLowerCase();
  return (
    /\.(jpg|jpeg|png|webp|gif)$/.test(clean) ||
    /imgbb\.com|i\.ibb\.co|ibb\.co/.test(url)
  );
};

export type UIComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;

  content: string;
  created_at: string;

  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    reputation_points: number;
    primaryBadge: { id: string; name: string; point: number } | null;
  };

  isPositiveReacted: boolean | null;
  isNegativeReacted: boolean | null;
  positiveReactionCount: number;
  negativeReactionCount: number;

  depth: number;
  children: UIComment[];

  materials?: MaterialResponse[];
  images?: MaterialResponse[];
  documents?: MaterialResponse[];
};

export function mapCommentToUI(
  c: CommentResponseDto,
  opts?: {
    postId?: string;
    parentCommentId?: string | null;
    depth?: number;
  }
): UIComment {
  return {
    id: c.id,
    post_id: opts?.postId ?? '',
    parent_comment_id:
      typeof opts?.parentCommentId !== 'undefined' ? opts?.parentCommentId : null,

    content: c.content,
    created_at: c.createdAt,

    author: {
      id: c.authorId,
      full_name: c.authorUsername ?? 'Unknown',
      avatar_url: c.authorAvatarUrl ?? null,
      reputation_points: c.authorPoint ?? 0,
      primaryBadge: null,
    },

    isPositiveReacted: c.isPositiveReacted,
    isNegativeReacted: c.isNegativeReacted,
    positiveReactionCount: c.positiveReactionCount ?? 0,
    negativeReactionCount: c.negativeReactionCount ?? 0,

    depth: opts?.depth ?? 0,
    children: (c.replies ?? []).map((child) =>
      mapCommentToUI(child, {
        postId: opts?.postId,
        parentCommentId: c.id,
        depth: (opts?.depth ?? 0) + 1,
      })
    ),
  };
}

export function mapCommentsToUITree(
  list: CommentResponseDto[],
  postId?: string,
  maxDepth: number = 999
): UIComment[] {
  // Guard against undefined or null list
  if (!list || !Array.isArray(list)) {
    return [];
  }

  const hasParentField = list.some(
    (c: any) => typeof (c as any).parentCommentId !== 'undefined'
  );

  if (hasParentField) {
    const byId = new Map<string, UIComment>();

    for (const c of list) {
      const parentId = (c as any).parentCommentId ?? null;
      const ui = mapCommentToUI(c, { postId, parentCommentId: parentId, depth: 0 });
      byId.set(c.id, { ...ui, children: [] });
    }

    const roots: UIComment[] = [];
    for (const c of list) {
      const parentId = (c as any).parentCommentId ?? null;
      const ui = byId.get(c.id)!;

      if (parentId && byId.has(parentId)) {
        const parent = byId.get(parentId)!;
        const nextDepth = (parent.depth ?? 0) + 1;
        if (nextDepth <= maxDepth) {
          ui.depth = nextDepth;
          parent.children.push(ui);
        }
      } else {
        roots.push(ui);
      }
    }
    return roots;
  }

  const childIds = new Set<string>();
  for (const c of list) {
    for (const r of c.replies ?? []) childIds.add(r.id);
  }
  const roots = list.filter((c) => !childIds.has(c.id));

  const recur = (
    node: CommentResponseDto,
    depth: number,
    parentId: string | null
  ): UIComment => {
    const ui = mapCommentToUI(node, { postId, parentCommentId: parentId, depth });
    if (depth >= maxDepth) return { ...ui, children: [] };
    const kids = (node.replies ?? []).map((child) =>
      recur(child, depth + 1, node.id)
    );
    return { ...ui, children: kids };
  };

  return roots.map((c) => recur(c, 0, null));
}

export function insertReplyIntoTree(
  tree: UIComment[],
  parentId: string,
  created: CommentResponseDto,
  maxDepth: number = 999
): UIComment[] {
  const dfs = (nodes: UIComment[]): UIComment[] =>
    nodes.map((n) => {
      if (n.id === parentId) {
        const child = mapCommentToUI(created, {
          postId: n.post_id,
          parentCommentId: n.id,
          depth: n.depth + 1,
        });
        if (n.depth + 1 > maxDepth) return n;
        return { ...n, children: [...(n.children ?? []), child] };
      }
      if (n.children?.length) {
        return { ...n, children: dfs(n.children) };
      }
      return n;
    });
  return dfs(tree);
}

export function updateCommentReactionOptimistic(
  tree: UIComment[],
  commentId: string,
  action: 'clear' | 'set-like' | 'set-dislike'
): UIComment[] {
  const walk = (nodes: UIComment[]): UIComment[] =>
    nodes.map((n) => {
      if (n.id === commentId) {
        let isPos = n.isPositiveReacted;
        let isNeg = n.isNegativeReacted;
        let pos = n.positiveReactionCount;
        let neg = n.negativeReactionCount;

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
          ...n,
          isPositiveReacted: isPos,
          isNegativeReacted: isNeg,
          positiveReactionCount: pos,
          negativeReactionCount: neg,
        };
      }
      if (n.children?.length) {
        return { ...n, children: walk(n.children) };
      }
      return n;
    });

  return walk(tree);
}

export function updateCommentLikeOptimistic(
  tree: UIComment[],
  commentId: string,
  like: boolean
): UIComment[] {
  return updateCommentReactionOptimistic(tree, commentId, like ? 'set-like' : 'clear');
}

export function attachMaterialsToTree(
  tree: UIComment[],
  materialsByCommentId: Record<string, MaterialResponse[]>
): UIComment[] {
  const dfs = (nodes: UIComment[]): UIComment[] =>
    nodes.map((n) => {
      const mats = materialsByCommentId[n.id] ?? [];
      const imgs = mats.filter((m) => isImageUrl(m.fileUrl));
      const docs = mats.filter((m) => !isImageUrl(m.fileUrl));
      return {
        ...n,
        materials: mats,
        images: imgs,
        documents: docs,
        children: dfs(n.children ?? []),
      };
    });
  return dfs(tree);
}