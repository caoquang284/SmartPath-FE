'use client';

import { Clock, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PostStatusBadgeProps {
  status: 'Accepted' | 'Pending' | 'Rejected';
  rejectReason?: string | null;
  aiReason?: string | null;
  className?: string;
}

export function PostStatusBadge({
  status,
  rejectReason,
  aiReason,
  className = ''
}: PostStatusBadgeProps) {
  const getBadgeInfo = () => {
    switch (status) {
      case 'Accepted':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: 'Published',
          color: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'Pending':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: 'Under Review',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'Rejected':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          text: 'Rejected',
          color: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          variant: 'outline' as const,
          icon: AlertCircle,
          text: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const info = getBadgeInfo();
  const Icon = info.icon;

  const getTooltipText = () => {
    if (status === 'Rejected') {
      return rejectReason || aiReason || 'Post was not approved by AI review';
    }
    if (status === 'Pending') {
      return aiReason || 'Post is being reviewed by AI';
    }
    return aiReason || 'Post was approved by AI review';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${info.color} ${className}`}
          >
            <Icon className="h-3 w-3 mr-1" />
            {info.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}