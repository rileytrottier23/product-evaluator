import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCreateSession, useExtractRequirements } from '@workspace/api-client-react';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SAMPLE_SPEC = `# Billing Agent Spec

The billing agent must issue refunds for double-charges within the 30-day window.
It must not issue refunds for requests older than 30 days, and must explain the policy when declining.
The agent should respond in the same language as the customer.
Be helpful to customers at all times.
When issuing a refund, the agent must call the process_refund tool with the correct order ID.`;

export default function InputPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [specText, setSpecText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSession = useCreateSession();
  const extractRequirements = useExtractRequirements();

  const handleLoadSample = () => {
    setSpecText(SAMPLE_SPEC);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSpecText(event.target?.result as string);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!specText.trim()) {
      toast({
        title: 'Spec is empty',
        description: 'Please paste or upload a spec to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const session = await createSession.mutateAsync({
        data: { specText },
      });

      await extractRequirements.mutateAsync({
        sessionId: session.id,
      });

      setLocation(`/session/${session.id}/requirements`);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error processing spec',
        description: 'An error occurred while creating the session or extracting requirements.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-12 flex flex-col md:flex-row shadow-xl rounded-2xl overflow-hidden">
      <div className="bg-[#0f172a] text-white p-10 flex flex-col justify-between w-full md:w-[38%] min-h-[500px]">
        <div>
          <div className="text-[#2563eb] font-mono text-[10px] uppercase tracking-[0.4em] mb-6">
            PRD TO EVALS ENGINE
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Turn specs into runnable test suites.
          </h1>
          <p className="text-white/60 leading-relaxed">
            Paste any AI agent spec and generate a structured, schema-valid eval suite for review and export.
          </p>
        </div>
        
        <div className="flex gap-4 mt-12">
          <div className="border border-white/10 rounded-lg px-3 py-2 flex-1">
            <div className="font-mono text-[10px] text-white/40 mb-1">APPROACH</div>
            <div className="text-sm font-medium">Review-first</div>
          </div>
          <div className="border border-white/10 rounded-lg px-3 py-2 flex-1">
            <div className="font-mono text-[10px] text-white/40 mb-1">FORMAT</div>
            <div className="text-sm font-medium">Schema-valid output</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 flex flex-col gap-6 border border-black/5 w-full md:w-[62%]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#64748b] mb-3 flex items-center justify-between">
            <span>PASTE YOUR SPEC</span>
            <button 
              onClick={handleLoadSample} 
              className="border border-black/10 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors" 
              data-testid="button-load-sample"
            >
              Load sample spec
            </button>
          </div>
          <Textarea
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            placeholder="e.g. The billing agent must issue refunds for double-charges within the 30-day window..."
            className="border border-black/10 bg-[#f8fafc] rounded-xl font-mono text-sm min-h-[220px] p-4 focus:border-[#2563eb] focus:ring-[#2563eb]/20 focus-visible:ring-1 resize-y"
            disabled={isProcessing}
            data-testid="textarea-spec"
          />
        </div>

        <div className="flex items-center gap-4 py-2">
          <div className="h-px bg-black/10 flex-1"></div>
          <div className="font-mono text-[10px] text-[#64748b] uppercase tracking-widest">OR</div>
          <div className="h-px bg-black/10 flex-1"></div>
        </div>

        <div>
          <input 
            type="file" 
            accept=".txt,.md" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            data-testid="input-file"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full border-2 border-dashed border-black/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-[#2563eb]/40 hover:bg-[#2563eb]/5 transition-all text-[#64748b] font-mono text-sm group"
            data-testid="button-upload"
          >
            <Upload className="w-5 h-5 mb-2 text-[#64748b] group-hover:text-[#2563eb] transition-colors" />
            <span className="mb-1">Upload .txt or .md file</span>
            <span className="text-[10px] uppercase tracking-widest opacity-60">Max 5MB</span>
          </button>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isProcessing || !specText.trim()}
          className="w-full mt-auto flex items-center justify-between bg-[#0f172a] text-white rounded-full px-6 py-4 hover:bg-[#2563eb] disabled:opacity-50 disabled:hover:bg-[#0f172a] transition-colors font-mono text-[11px] uppercase tracking-widest group"
          data-testid="button-submit-spec"
        >
          <span>{isProcessing ? 'READING YOUR SPEC...' : 'EXTRACT REQUIREMENTS'}</span>
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
            {isProcessing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowRight className="w-3 h-3" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}