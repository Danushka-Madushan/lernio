import { Button } from '@heroui/react';
import { AlertTriangle, Loader2, Trash, Trash2, X } from 'lucide-react';

/**
 * Example Delete Confirmation Modal
 * 
 * DESIGN.md References:
 * - Colors: Uses `danger` (#c5221f) and `danger-container` (#fce8e6) for destructive actions.
 * - Shapes: Uses `rounded-2xl` for the modal surface and `rounded-xl` for inner banners.
 * - Elevation: Deep shadow `shadow-2xl` combined with a subtle `ring-1 ring-black/10` to detach from backdrop.
 * - Components: Overlay uses `bg-black/40 backdrop-blur-sm`.
 */
export default function ExampleDeleteModal({ loading, onConfirm, onCancel }: {
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      
      {/* Modal Surface - rounded-xl per DESIGN.md */}
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        
        {/* Header - Danger Gradient */}
        <div className="relative bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Delete Item</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body - Danger Container (Feedback Pill) */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">This action is irreversible</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to permanently delete this item?
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Secondary Background */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} variant='danger' onPress={onConfirm} isDisabled={loading}>
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Action
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
