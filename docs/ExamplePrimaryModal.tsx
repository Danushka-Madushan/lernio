import { Button } from '@heroui/react';
import { Loader2, Plus, UserPlus, X } from 'lucide-react';

/**
 * Example Primary Modal
 * 
 * DESIGN.md References:
 * - Colors: Uses primary blue (#3b82f6) transitioning to a deeper ink (#0d47a1) for branded header moments.
 * - Shapes: 16px (`rounded-2xl`) for modal dialogs.
 * - Typography: Dense form clusters use 12px (`text-xs`) text with muted `#5f6368` labels.
 */
export default function ExamplePrimaryModal({ loading, onSubmit, onCancel }: {
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      
      {/* Modal Surface */}
      <div className="w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        
        {/* Header - Primary Brand Gradient */}
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserPlus size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Create New Entity</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body - Standard Input Padding & Typography */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <form id="example-form" onSubmit={onSubmit} className="space-y-4">
            
            {/* Form Cluster */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">
                Name <span className="font-normal text-[#9aa0a6]">(required)</span>
              </label>
              <input type="text"
                disabled={loading} placeholder="Enter name"
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                required />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} type="submit" form="example-form" isDisabled={loading} variant="primary">
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
