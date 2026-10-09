'use client';

import { useState } from 'react';
import { Button } from '@heroui/react';
import { X, Layers, Loader2 } from 'lucide-react';

interface CreateExamGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newGroup: any) => void;
}

export default function CreateExamGroupModal({
  isOpen,
  onClose,
  onCreated,
}: CreateExamGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Group name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/exam-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam group');
      }

      onCreated(data.group);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !isSubmitting && onClose()}
    >
      <div className="w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300">
        <div className="bg-linear-to-br from-purple-600 via-indigo-600 to-blue-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-white" />
              <span className="text-base font-semibold text-white">Create Exam Group</span>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Science Term 1 Final (Papers I & II)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Combined subject evaluation for term test..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onPress={onClose}
              isDisabled={isSubmitting}
              className="text-xs font-medium h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isDisabled={isSubmitting}
              className="text-xs font-semibold h-9 px-5 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
