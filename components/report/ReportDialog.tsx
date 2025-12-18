'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reportAPI } from '@/lib/api/reportAPI';

interface ReportDialogProps {
  type: 'post' | 'comment' | 'user';
  id: string;
  trigger?: React.ReactNode;
}

const REPORT_REASONS = [
  'Spam',
  'Inappropriate Content',
  'Harassment',
  'Hate Speech',
  'Misinformation',
  'Other',
];

export function ReportDialog({ type, id, trigger }: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please select a reason for reporting.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await reportAPI.create({
        postId: type === 'post' ? id : undefined,
        commentId: type === 'comment' ? id : undefined,
        targetUserId: type === 'user' ? id : undefined,
        reason,
        details,
      });

      toast({
        title: 'Report Submitted',
        description: 'Thank you for your report. We will review it shortly.',
      });
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {type === 'user' ? 'User' : type === 'post' ? 'Post' : 'Comment'}</DialogTitle>
          <DialogDescription>
            Please help us understand what's wrong with this content.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="details">Additional Details (Optional)</Label>
            <Textarea
              id="details"
              placeholder="Please provide more context..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
