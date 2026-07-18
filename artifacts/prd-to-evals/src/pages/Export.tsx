import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { 
  useGetSessionCoverage,
  useExportSession,
  getGetSessionCoverageQueryKey
} from '@workspace/api-client-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, FileJson, FileCode2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <Skeleton className="h-16 w-32 mx-auto mb-8 rounded-full" />
        <Skeleton className="h-12 w-64 mx-auto mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-[#2563eb]" />
        </div>
        <h1 className="text-5xl uppercase font-bold tracking-tight mb-4 text-[#0f172a]">EXPORT READY.</h1>
        <div className="text-[#64748b] font-mono text-[12px] uppercase tracking-widest">
          {coverage.totalApproved} CASES APPROVED FOR EXPORT
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        <div className="bg-white border border-black/5 rounded-xl p-6 text-center card-hover shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="text-4xl font-bold text-[#0f172a] mb-3">{coverage.categoryDistribution.task_success || 0}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b]">Task Success</div>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-6 text-center card-hover shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="text-4xl font-bold text-[#f59e0b] mb-3">{coverage.categoryDistribution.guardrail || 0}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b]">Guardrails</div>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-6 text-center card-hover shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="text-4xl font-bold text-[#9333ea] mb-3">{coverage.categoryDistribution.format || 0}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b]">Format</div>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-6 text-center card-hover shadow-sm flex flex-col justify-center min-h-[140px]">
          <div className="text-4xl font-bold text-[#22c55e] mb-3">{coverage.categoryDistribution.tool_use || 0}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b]">Tool Use</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 justify-center mt-16">
        <div 
          onClick={() => !isExporting && handleDownload('yaml')}
          className={cn("bg-[#0f172a] text-white rounded-2xl p-10 flex flex-col items-center gap-4 transition-all card-hover w-full sm:w-[320px]", !isExporting && "cursor-pointer hover:bg-[#2563eb] hover:shadow-2xl hover:-translate-y-2", isExporting && "opacity-50")}
          data-testid="btn-download-yaml"
        >
          <FileCode2 className="w-10 h-10 opacity-80 mb-2" />
          <h2 className="text-3xl font-bold">YAML</h2>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/60">Standard promptfoo format</div>
        </div>

        <div 
          onClick={() => !isExporting && handleDownload('json')}
          className={cn("bg-[#0f172a] text-white rounded-2xl p-10 flex flex-col items-center gap-4 transition-all card-hover w-full sm:w-[320px]", !isExporting && "cursor-pointer hover:bg-[#2563eb] hover:shadow-2xl hover:-translate-y-2", isExporting && "opacity-50")}
          data-testid="btn-download-json"
        >
          <FileJson className="w-10 h-10 opacity-80 mb-2" />
          <h2 className="text-3xl font-bold">JSON</h2>
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/60">For custom runners</div>
        </div>
      </div>
    </div>
  );
}