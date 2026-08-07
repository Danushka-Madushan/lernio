import { ShieldOff } from 'lucide-react';

/**
 * Example Empty / Inactive State Screen
 * 
 * DESIGN.md References:
 * - Typography: Captions use `12px` highly tracked uppercase strings for section dividers (`tracking-widest`).
 * - Layout: Empty states are vertically and horizontally centered with readable line-heights.
 * - Depth/Visuals: Uses glowing blur shadows (`blur-xl opacity-60 scale-125`) behind icons to signify state.
 * - Colors: Red/Danger colors mapped cleanly from `#fce8e6` variants (red-50 to red-100).
 */
export default function ExampleEmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        
        {/* Glowing Icon Element */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-100 blur-xl opacity-60 scale-125" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-red-50 to-red-100 shadow-lg ring-1 ring-red-200">
              <ShieldOff size={36} className="text-red-500" />
            </div>
          </div>
        </div>

        {/* Text Messaging */}
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#202124]">
          State Title (e.g., Access Denied)
        </h1>
        <p className="mb-2 text-[15px] leading-relaxed text-[#5f6368]">
          Detailed explanation of why this state is currently active.
        </p>
        <p className="text-sm text-[#80868b]">
          Secondary help text or instruction.
        </p>

        {/* Decorative Helpful Instructions Card */}
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left">
          
          {/* Tracked Uppercase Caption */}
          <p className="text-[12px] font-semibold uppercase tracking-widest text-red-400 mb-1">
            What to do
          </p>
          
          {/* Instruction List */}
          <ul className="space-y-1.5 text-[13px] text-red-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">•</span>
              Primary action to resolve this issue
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">•</span>
              Secondary alternative step
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
