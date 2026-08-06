import { Check, Clock, Globe, ShieldAlert } from 'lucide-react';

/**
 * Example Status Badges (Pills)
 * 
 * DESIGN.md References:
 * - Colors: Semantic feedback colors use high-saturation foregrounds (e.g., text-red-600) 
 *   against low-saturation pastel backgrounds (bg-red-50).
 * - Shapes: Badges use Pill/Fully rounded (`rounded-full`).
 * - Typography: Dense informational metadata uses `text-[10px]` with `font-semibold`.
 */
export default function ExampleStatusBadges() {
  return (
    <div className="flex gap-2 p-4 bg-white rounded-lg">
      
      {/* Danger/Expired State */}
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        <ShieldAlert size={9} /> Expired
      </span>

      {/* Warning/Pending State */}
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
        <Clock size={9} /> Not Yet Active
      </span>

      {/* Info/Neutral State */}
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
        <Globe size={9} /> No Expiry
      </span>

      {/* Success/Active State */}
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        <Check size={9} /> Active
      </span>

    </div>
  );
}
