'use client';

import { useState, useEffect } from 'react';
import { reportAPI } from '@/lib/api/reportAPI';
import { ReportResponseDto, ReportStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { Check, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, locale } = useLanguage();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportAPI.getPending();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
      toast({
        title: t.common.error,
        description: t.reports.errorLoad,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleStatusUpdate = async (id: string, status: ReportStatus) => {
    try {
      await reportAPI.updateStatus(id, status);
      toast({
        title: t.common.success,
        description: status === ReportStatus.Resolved ? t.reports.successResolved : t.reports.successRejected,
      });
      // Remove from list or refresh
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to update report status', error);
      toast({
        title: t.common.error,
        description: t.reports.errorUpdate,
        variant: 'destructive',
      });
    }
  };

  const getTargetLink = (report: ReportResponseDto) => {
    const pid = report.postId || report.post_id;
    const cid = report.commentId || report.comment_id;
    const uid = report.targetUserId || report.target_user_id;

    if (pid) return `/forum/${pid}${cid ? `#comment-${cid}` : ''}`;
    if (uid) return `/profile/${uid}`;
    return '#';
  };

  const getTargetType = (report: ReportResponseDto) => {
    const pid = report.postId || report.post_id;
    const cid = report.commentId || report.comment_id;
    const uid = report.targetUserId || report.target_user_id;

    if (pid && !cid) return t.reports.post;
    if (cid) return t.reports.comment;
    if (uid) return t.reports.user;
    return t.reports.unknown;
  };

  if (loading) {
    return <div className="p-8 text-center">{t.common.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t.reports.title}</h1>
        <Button onClick={fetchReports} variant="outline">{t.reports.refresh}</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports.pendingReports}</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.reports.noPendingReports}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.reports.reporter}</TableHead>
                  <TableHead>{t.reports.target}</TableHead>
                  <TableHead>{t.reports.reason}</TableHead>
                  <TableHead>{t.reports.details}</TableHead>
                  <TableHead>{t.reports.date}</TableHead>
                  <TableHead className="text-right">{t.reports.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const reporterId = report.reporterId || report.reporter_id;
                  const reporterName = report.reporterUsername || report.reporter_username || t.reports.unknownUser;
                  const date = report.createdAt || report.created_at || new Date().toISOString();

                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        {reporterId ? (
                          <Link href={`/profile/${reporterId}`} className="hover:underline font-medium">
                            {reporterName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{reporterName}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className="w-fit mb-1">
                            {getTargetType(report)}
                          </Badge>
                          <Link href={getTargetLink(report)} className="text-sm text-blue-600 hover:underline flex items-center gap-1" target="_blank">
                            {t.reports.viewTarget} <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell className="max-w-xs truncate" title={report.details}>
                        {report.details || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(date), { addSuffix: true, locale: locale === 'vi' ? vi : enUS })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleStatusUpdate(report.id, ReportStatus.Resolved)}
                        >
                          <Check className="h-4 w-4 mr-1" /> {t.reports.resolve}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleStatusUpdate(report.id, ReportStatus.Rejected)}
                        >
                          <X className="h-4 w-4 mr-1" /> {t.reports.reject}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
