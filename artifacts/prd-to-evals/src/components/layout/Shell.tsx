import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useGetSession } from '@workspace/api-client-react';
import { getGetSessionQueryKey } from '@workspace/api-client-react';

const STAGES = [
  { id: 'input', label: '1. Input', path: '/' },
  { id: 'requirements', label: '2. Requirements', path: '/session/:id/requirements' },
  { id: 'cases', label: '3. Review Cases', path: '/session/:id/cases' },
  { id: 'export', label: '4. Export', path: '/session/:id/export' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const sessionIdMatch = location.match(/\/session\/([^\/]+)/);
  const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

  const { data: session } = useGetSession(sessionId!, {
    query: {
      enabled: !!sessionId,
      queryKey: getGetSessionQueryKey(sessionId!),
    },
  });

  const getStageStatus = (stageId: string, index: number) => {
    // 0 is input
    if (stageId === 'input' && location === '/') return 'current';
    if (location === '/') return 'upcoming';

    if (!sessionId) return 'upcoming';

    // If we have a sessionId, we check the path
    const stagePath = STAGES[index].path.replace(':id', sessionId);
    
    // Find current index
    const currentIndex = STAGES.findIndex(s => s.path.replace(':id', sessionId) === location || (s.id === 'input' && location === '/'));
    
    if (index === currentIndex) return 'current';
    if (index < currentIndex) return 'complete';
    return 'upcoming';
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex flex-row items-center justify-between p-2 rounded-full bg-white/90 backdrop-blur-md shadow-xl border border-black/5 h-16 max-w-5xl w-full mx-auto">
          <Link href="/" className="px-4 font-bold text-[#0f172a] tracking-tight shrink-0 flex items-center" data-testid="link-home" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            PRD-TO-EVALS<span className="text-[#2563eb]">.</span>
          </Link>
          
          <nav className="flex-1 flex items-center justify-center">
            <ol className="flex items-center">
              {STAGES.map((stage, index) => {
                const status = getStageStatus(stage.id, index);
                const path = sessionId ? stage.path.replace(':id', sessionId) : (index === 0 ? '/' : '#');
                
                return (
                  <li key={stage.id} className="flex items-center">
                    {index !== 0 && (
                      <div className="w-6 h-px bg-black/10 mx-2" aria-hidden="true" />
                    )}
                    
                    {status === 'complete' || status === 'current' ? (
                      <Link 
                        href={path}
                        className={cn(
                          "transition-colors",
                          status === 'current' 
                            ? "bg-[#0f172a] text-white rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest flex items-center" 
                            : "text-[#0f172a]/60 font-mono text-[11px] uppercase tracking-widest flex items-center hover:text-[#0f172a]"
                        )}
                        data-testid={`stepper-${stage.id}`}
                      >
                        {status === 'complete' && (
                          <span className="mr-1">✓</span>
                        )}
                        <span>{stage.label}</span>
                      </Link>
                    ) : (
                      <div 
                        className="text-[#0f172a]/40 font-mono text-[11px] uppercase tracking-widest cursor-not-allowed flex items-center"
                        data-testid={`stepper-${stage.id}-disabled`}
                      >
                        <span>{stage.label}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="shrink-0 px-4 w-40 flex justify-end">
             {session?.specTitle && (
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b] truncate max-w-[140px]" title={session.specTitle}>
                  {session.specTitle}
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-24 pb-8 container mx-auto px-4 max-w-5xl">
        {children}
      </main>
    </div>
  );
}