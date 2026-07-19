import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { 
  useGetSession, 
  useUpdateCase,
  useGetSessionCoverage,
  getGetSessionQueryKey,
  getGetSessionCoverageQueryKey,
  EvalCaseCategory,
  GeneratedCase,
  CaseUpdateStatus,
  ExtractedRequirement
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SessionError } from '@/components/ui/session-error';

function CaseCard({ 
  generatedCase, 
  requirement, 
  sessionId 
}: { 
  generatedCase: GeneratedCase, 
  requirement?: ExtractedRequirement,
  sessionId: string 
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCase = useUpdateCase();
  
  const c = generatedCase.case;
  const isApproved = generatedCase.status === 'approved';
  const isDropped = generatedCase.status === 'dropped';

  const handleStatusChange = async (status: CaseUpdateStatus) => {
    try {
      queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          cases: old.cases.map((gc: GeneratedCase) => 
            gc.id === generatedCase.id ? { ...gc, status } : gc
          )
        };
      });

      await updateCase.mutateAsync({
        sessionId,
        caseId: generatedCase.id,
        data: { status }
      });
      
      queryClient.invalidateQueries({ queryKey: getGetSessionCoverageQueryKey(sessionId) });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
      toast({
        title: 'Error updating case status',
        variant: 'destructive'
      });
    }
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    approved: 'bg-green-100 text-green-700',
    dropped: 'bg-red-100 text-red-700'
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 pb-8 border-b border-black/5 last:border-0">
      <div className="w-full md:w-[30%] bg-[#f8fafc] rounded-xl border border-black/5 p-4 flex flex-col items-start h-fit">
        <div className="text-[#2563eb] font-mono text-[10px] uppercase tracking-[0.3em] mb-3">SOURCE</div>
        {requirement ? (
          <>
            <div className="font-mono text-[10px] bg-[#e2e8f0] px-2 py-0.5 rounded text-[#475569] mb-3">{requirement.requirementId}</div>
            <div className="font-sans text-sm text-[#64748b] leading-relaxed">{requirement.text}</div>
          </>
        ) : (
          <div className="text-sm italic text-[#64748b]">Requirement not found</div>
        )}
      </div>

      <div className={cn(
        "w-full md:w-[70%] bg-white rounded-xl border border-black/5 shadow-sm card-hover p-6 relative overflow-hidden",
        isApproved && "bg-blue-50/30",
        isDropped && "opacity-40"
      )}>
        {isApproved && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2563eb]" />}
        
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[11px] text-[#64748b]">{c.id}</span>
          <span className="font-mono text-[10px] uppercase rounded-full px-2 py-0.5 border border-black/5 text-[#475569] bg-white">
            {c.category.replace('_', ' ')}
          </span>
          <span className={cn(
            "font-mono text-[10px] uppercase rounded-full px-2 py-0.5",
            statusColors[generatedCase.status as keyof typeof statusColors]
          )}>
            {generatedCase.status}
          </span>
        </div>

        <h3 className="font-sans font-semibold text-[#0f172a] text-lg mb-5">{c.description}</h3>

        <div className="mb-5">
          <div className="font-mono text-[10px] text-[#64748b] uppercase tracking-widest mb-2">TEST PROMPT</div>
          <div className="border-l-[3px] border-black/10 bg-[#f8fafc] px-4 py-3 rounded font-mono text-xs text-[#0f172a] whitespace-pre-wrap">
            {c.input.messages[0]?.content || 'No prompt provided'}
          </div>
        </div>

        <div className="mb-8">
          <div className="font-mono text-[10px] text-[#2563eb] uppercase tracking-widest mb-2">EXPECTED BEHAVIOUR</div>
          <div className="font-sans text-sm text-[#0f172a] mb-3 leading-relaxed">{c.expected.behaviour}</div>
          <div className="bg-[#f1f5f9] rounded-lg px-3 py-2 font-mono text-xs text-[#475569]">
            {c.expected.graders[0]?.rubric || 'No rubric'}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => handleStatusChange('approved')} 
            className="rounded-full bg-[#0f172a] text-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-[#2563eb] transition-colors" 
            data-testid={`btn-approve-${generatedCase.id}`}
          >
            APPROVE
          </button>
          <button 
            className="rounded-full border border-black/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#0f172a] hover:bg-black/5 transition-colors" 
            data-testid={`btn-edit-${generatedCase.id}`}
          >
            EDIT
          </button>
          <button 
            onClick={() => handleStatusChange('dropped')} 
            className="rounded-full border border-black/10 text-[#64748b] px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:text-red-600 hover:border-red-200 transition-colors" 
            data-testid={`btn-drop-${generatedCase.id}`}
          >
            DROP
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const [, params] = useRoute('/session/:id/cases');
  const sessionId = params?.id;
  const [, setLocation] = useLocation();

  const { data: session, isLoading: isSessionLoading, isError: isSessionError } = useGetSession(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId!),
      retry: 1,
    },
  });

  const { data: coverage, isLoading: isCoverageLoading } = useGetSessionCoverage(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionCoverageQueryKey(sessionId!),
    },
  });

  if (isSessionLoading) {
    return (
      <div className="w-full py-8 space-y-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (isSessionError || !session) {
    return <SessionError />;
  }

  const cases = session.cases || [];
  const requirementsMap = new Map(session.requirements?.map(r => [r.requirementId, r]));
  
  const canExport = cases.some(c => c.status === 'approved');

  return (
    <div className="w-full py-6 pb-24">
      <div className="bg-[#0f172a] rounded-xl px-6 py-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isCoverageLoading || !coverage ? (
          <Skeleton className="h-4 w-64 opacity-50" />
        ) : (
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/70 text-center sm:text-left">
            {coverage.totalApproved} APPROVED · {coverage.categoryDistribution?.guardrail || 0} GUARDRAILS · {coverage.categoryDistribution?.format || 0} FORMAT · {coverage.categoryDistribution?.tool_use || 0} TOOL USE
          </div>
        )}
        <button 
          disabled={!canExport} 
          onClick={() => setLocation(`/session/${sessionId}/export`)}
          className="bg-white/10 text-white rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-white/20 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          EXPORT
        </button>
      </div>

      <div className="space-y-8">
        {cases.map(gc => (
          <CaseCard 
            key={gc.id} 
            generatedCase={gc} 
            requirement={requirementsMap.get(gc.sourceRequirementId)} 
            sessionId={sessionId!}
          />
        ))}

        {cases.length === 0 && (
          <div className="text-center py-20 bg-[#f8fafc] rounded-xl border border-black/5 border-dashed">
            <p className="text-[#64748b] font-mono text-sm uppercase tracking-widest">No cases generated yet.</p>
          </div>
        )}
      </div>

      {cases.length > 0 && (
        <div className="mt-16 flex justify-center">
          <button 
            disabled={!canExport}
            onClick={() => setLocation(`/session/${sessionId}/export`)}
            className="bg-[#0f172a] text-white rounded-full px-8 py-4 font-mono text-[11px] uppercase tracking-widest hover:bg-[#2563eb] transition-colors flex items-center disabled:opacity-50 disabled:hover:bg-[#0f172a]"
          >
            EXPORT APPROVED CASES
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  );
}