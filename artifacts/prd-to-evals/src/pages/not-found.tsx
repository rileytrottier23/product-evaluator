import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    // -mt-24 and -mx-4 break out of Shell's padding/container so we get a full dark canvas
    <div className="relative -mt-24 -mx-4 min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-md w-full">
        {/* Big muted number */}
        <p
          className="text-[160px] font-bold leading-none text-white/[0.04] text-center select-none"
          style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
        >
          404
        </p>

        {/* Icon — sits on top of the big number */}
        <div className="w-16 h-16 bg-[#2563eb] rounded-full flex items-center justify-center mx-auto -mt-10 mb-8 shadow-lg shadow-blue-500/20">
          <span
            className="text-white font-bold text-xl"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            ?
          </span>
        </div>

        {/* Copy */}
        <div className="text-center space-y-3 mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#2563eb]">
            Page not found
          </p>
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            Nothing here.
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            The page you're looking for doesn't exist. Head back and start a new session.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => setLocation('/')}
          className="w-full flex items-center justify-between bg-white/10 border border-white/10 text-white rounded-full px-6 py-4 hover:bg-[#2563eb] hover:border-[#2563eb] transition-all group"
        >
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-[11px] uppercase tracking-widest font-bold">
              Back to home
            </span>
          </div>
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </div>
        </button>
      </div>
    </div>
  );
}
