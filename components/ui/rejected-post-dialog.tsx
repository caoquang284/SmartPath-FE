'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import {
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Lightbulb,
  X,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface RejectedPostDialogProps {
  open: boolean;
  onClose: () => void;
  post: {
    id: string;
    title: string;
    content: string;
    rejectReason?: string | null;
    aiReason?: string | null;
    aiConfidence?: number | null;
    aiCategoryMatch?: boolean | null;
    reviewedAt?: string | null;
  };
}

export function RejectedPostDialog({ open, onClose, post }: RejectedPostDialogProps) {
  // Defensive check - if post is null or undefined, don't render
  if (!post) return null;

  const getConfidenceColor = (confidence?: number | null) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.7) return 'text-green-600';
    if (confidence >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence?: number | null) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.7) return 'High Confidence';
    if (confidence >= 0.4) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-6 w-6" />
            Post Not Approved
          </DialogTitle>
          <DialogDescription>
            Your post was reviewed by our AI content moderator and was not approved for publication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Preview */}
          <div className="space-y-3">
            <h4 className="font-semibold">Your Post:</h4>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h5 className="font-medium mb-2">{post.title || 'Untitled Post'}</h5>
              <p className="text-sm text-gray-600 line-clamp-3">{post.content || 'No content'}</p>
            </div>
          </div>

          <Separator />

          {/* AI Review Results */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              AI Review Results
            </h4>

            {post.aiConfidence !== undefined && post.aiConfidence !== null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">AI Confidence:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getConfidenceColor(post.aiConfidence)}`}>
                    {Math.round(post.aiConfidence * 100)}%
                  </span>
                  <Badge
                    variant={post.aiConfidence >= 0.7 ? "default" : post.aiConfidence >= 0.4 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {getConfidenceLabel(post.aiConfidence)}
                  </Badge>
                </div>
              </div>
            )}

            {post.aiCategoryMatch !== undefined && post.aiCategoryMatch !== null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Category Match:</span>
                <Badge variant={post.aiCategoryMatch ? "default" : "destructive"} className="text-xs">
                  {post.aiCategoryMatch ? "Good Match" : "Poor Match"}
                </Badge>
              </div>
            )}

            {post.reviewedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>Reviewed {formatDistanceToNow(new Date(post.reviewedAt), { addSuffix: true })}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Rejection Reasons */}
          <div className="space-y-3">
            {post.rejectReason && (
              <div>
                <h5 className="font-medium text-red-600 mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Rejection Reason:
                </h5>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{post.rejectReason}</p>
                </div>
              </div>
            )}

            {post.aiReason && (
              <div>
                <h5 className="font-medium text-blue-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  AI Analysis:
                </h5>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">{post.aiReason}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Improvement Suggestions */}
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggestions for improvement:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {post.aiCategoryMatch === false && (
                  <li>Ensure your post content matches the selected categories</li>
                )}
                {post.aiConfidence !== undefined && post.aiConfidence !== null && post.aiConfidence < 0.7 && (
                  <li>Make your post more detailed and specific</li>
                )}
                <li>Check for inappropriate or offensive language</li>
                <li>Ensure the content is helpful and appropriate for the community</li>
                <li>Use clear formatting and proper grammar</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}