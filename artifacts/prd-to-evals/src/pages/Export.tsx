import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { 
  useGetSessionCoverage,
  useExportSession,
  getGetSessionCoverageQueryKey
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Download, FileJson, FileCode2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ExportPage() {
  const [, params] = useRoute('/session/:id/export');
  const sessionId = params?.id;
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);

  const { data: coverage, isLoading: isCoverageLoading } = useGetSessionCoverage(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionCoverageQueryKey(sessionId!),
    },
  });

  const exportSession = useExportSession();

  const handleDownload = async (format: 'yaml' | 'json') => {
    setIsExporting(true);
    try {
      const result = await exportSession.mutateAsync({ sessionId: sessionId! });
      
      const content = format === 'yaml' ? result.yaml : result.json;
      const type = format === 'yaml' ? 'text/yaml' : 'application/json';
      const extension = format === 'yaml' ? 'yml' : 'json';
      
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eval-cases.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Download complete',
        description: `Your cases have been exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to generate the export files.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isCoverageLoading || !coverage) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <Skeleton className="h-12 w-64 mx-auto mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Ready for Export</h1>
        <p className="text-xl text-muted-foreground">
          You've approved <span className="font-semibold text-foreground">{coverage.totalApproved}</span> test cases.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-card border rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl font-bold">{coverage.categoryDistribution.task_success || 0}</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Task Success</div>
        </div>
        <div className="bg-card border rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-500">{coverage.categoryDistribution.guardrail || 0}</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Guardrails</div>
        </div>
        <div className="bg-card border rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">{coverage.categoryDistribution.format || 0}</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Format</div>
        </div>
        <div className="bg-card border rounded-xl p-6 text-center space-y-2">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{coverage.categoryDistribution.tool_use || 0}</div>
          <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tool Use</div>
        </div>
      </div>

      <div className="bg-muted/30 border rounded-2xl p-8 max-w-2xl mx-auto flex flex-col sm:flex-row gap-6">
        <Button 
          className="flex-1 h-20 text-lg flex flex-col items-center justify-center gap-2" 
          variant="outline"
          onClick={() => handleDownload('yaml')}
          disabled={isExporting || coverage.totalApproved === 0}
          data-testid="btn-download-yaml"
        >
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-muted-foreground" />
            <span>Download YAML</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground">Standard promptfoo format</span>
        </Button>

        <Button 
          className="flex-1 h-20 text-lg flex flex-col items-center justify-center gap-2"
          onClick={() => handleDownload('json')}
          disabled={isExporting || coverage.totalApproved === 0}
          data-testid="btn-download-json"
        >
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 opacity-80" />
            <span>Download JSON</span>
          </div>
          <span className="text-xs font-normal opacity-80">For custom runners</span>
        </Button>
      </div>

      {coverage.uncoveredRequirements.length > 0 && (
        <p className="text-center mt-8 text-sm text-muted-foreground">
          Note: {coverage.uncoveredRequirements.length} requirements do not have any approved test cases.
        </p>
      )}
    </div>
  );
}
