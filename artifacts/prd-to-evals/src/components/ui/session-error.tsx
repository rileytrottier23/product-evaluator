import { useLocation } from 'wouter';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

interface SessionErrorProps {
  title?: string;
  message?: string;
}

export function SessionError({
  title = 'Session not found',
  message = 'This session may have expired or the link is invalid. Sessions are kept for 24 hours.',
}: SessionErrorProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mb-8 mx-auto">
          <AlertTriangle className="w-7 h-7 text-[#2563eb]" />
        </div>

        {/* Copy */}
        <div className="text-center space-y-3 mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#2563eb]">
            Error
          </p>
          <h1 className="font-['Bricolage_Grotesque',_sans-serif] text-3xl font-bold text-[#0f172a] tracking-tight">
            {title}
          </h1>
          <p className="text-[#64748b] text-sm leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => setLocation('/')}
          className="w-full flex items-center justify-between bg-[#0f172a] text-white rounded-full px-6 py-4 hover:bg-[#2563eb] transition-all group"
        >
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest font-bold">
              Start a new session
            </span>
          </div>
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#0f172a] group-hover:bg-[#0f172a] group-hover:text-white transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </div>
        </button>
      </div>
    </div>
  );
}
