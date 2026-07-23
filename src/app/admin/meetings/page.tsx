'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash,
  X,
  Clock,
  ChevronDown,
  Globe,
  ShieldAlert,
  Calendar,
  Trash2,
  Video,
  Settings,
  Link as LinkIcon
} from 'lucide-react';
import { Button, Switch } from '@heroui/react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11';

interface ZoomAccount {
  id: string;
  name: string;
  email: string;
  accountId: string;
  clientId: string;
}

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  grade: Grade | null;
  link: string;
  zoomAccountId?: string | null;
  meetingId?: string | null;
  startUrl?: string | null;
  duration?: number | null;
  isRecurring?: boolean;
  hostVideo?: boolean;
  participantVideo?: boolean;
  waitingRoom?: boolean;
  zoomAccount?: { name: string; email: string } | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<Grade, string> = {
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
};

const GRADE_COLORS: Record<Grade, string> = {
  GRADE_6: 'bg-purple-50 text-purple-700',
  GRADE_7: 'bg-blue-50 text-blue-700',
  GRADE_8: 'bg-cyan-50 text-cyan-700',
  GRADE_9: 'bg-green-50 text-green-700',
  GRADE_10: 'bg-yellow-50 text-yellow-700',
  GRADE_11: 'bg-orange-50 text-orange-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(meeting: Meeting): boolean {
  const scheduled = new Date(meeting.scheduledAt);
  const now = new Date();
  // Expired if more than 2 hours past scheduled time (or duration)
  const durationMs = (meeting.duration || 60) * 60 * 1000;
  // Give 1 hour buffer after duration ends before calling it expired
  return now.getTime() - scheduled.getTime() > (durationMs + 60 * 60 * 1000);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

function DateTimePicker({
  label,
  value,
  onChange,
  disabled,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minDate?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[#5f6368]">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={minDate}
        className="w-full rounded-lg border bg-white px-3 py-2 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

// ─── AddMeetingModal ───────────────────────────────────────────────────────────

function AddMeetingModal({
  title, link, scheduledAt, grade, zoomAccountId, durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom, zoomAccounts,
  creating, error, success,
  onTitleChange, onLinkChange, onScheduledAtChange, onGradeChange, onZoomAccountIdChange, onDurationMinutesChange, onIsRecurringChange, onHostVideoChange, onParticipantVideoChange, onWaitingRoomChange,
  onSubmit, onCancel,
}: {
  title: string; link: string; scheduledAt: string; grade: Grade | ''; zoomAccountId: string; durationMinutes: number; isRecurring: boolean; hostVideo: boolean; participantVideo: boolean; waitingRoom: boolean; zoomAccounts: ZoomAccount[];
  creating: boolean; error: string; success: string;
  onTitleChange: (v: string) => void;
  onLinkChange: (v: string) => void;
  onScheduledAtChange: (v: string) => void;
  onGradeChange: (v: Grade | '') => void;
  onZoomAccountIdChange: (v: string) => void;
  onDurationMinutesChange: (v: number) => void;
  onIsRecurringChange: (v: boolean) => void;
  onHostVideoChange: (v: boolean) => void;
  onParticipantVideoChange: (v: boolean) => void;
  onWaitingRoomChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}>
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Create Zoom Meeting</span>
            </div>
            <button type="button" onClick={onCancel} disabled={creating} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>
          )}

          <form id="add-meeting-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account <span className="font-normal text-[#9aa0a6]">(Host)</span></label>
              <div className="relative">
                <select value={zoomAccountId} onChange={(e) => onZoomAccountIdChange(e.target.value)} disabled={creating}
                  className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                  <option value="">— Manual Link (No API) —</option>
                  {zoomAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} ({account.email})</option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
              <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)}
                disabled={creating} placeholder="e.g. Science Class Chapter 4"
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                required />
            </div>

            {!zoomAccountId && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Zoom Link</label>
                <input type="text" value={link} onChange={(e) => onLinkChange(e.target.value)}
                  disabled={creating} placeholder="https://zoom.us/j/..."
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                  required={!zoomAccountId} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
                <div className="relative">
                  <select value={grade} onChange={(e) => onGradeChange(e.target.value as Grade | '')} disabled={creating}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">— All Grades —</option>
                    {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
              </div>

              <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={onScheduledAtChange} disabled={creating} />
            </div>

            {zoomAccountId && (
              <>
                <div className="grid grid-cols-2 gap-4 border-t border-[#e8eaed] pt-4 mt-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Duration (Minutes)</label>
                    <input type="number" value={durationMinutes} onChange={(e) => onDurationMinutesChange(parseInt(e.target.value) || 60)}
                      disabled={creating} min={15} max={300} step={15}
                      className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                      required />
                  </div>

                  <div className="flex flex-col justify-center">
                    <Switch isSelected={isRecurring} onChange={onIsRecurringChange} isDisabled={creating}>
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                        Recurring Meeting
                      </Switch.Content>
                    </Switch>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Switch isSelected={hostVideo} onChange={onHostVideoChange} isDisabled={creating}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Host Video On
                    </Switch.Content>
                  </Switch>
                  <Switch isSelected={participantVideo} onChange={onParticipantVideoChange} isDisabled={creating}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Participant Video On
                    </Switch.Content>
                  </Switch>
                  <Switch isSelected={waitingRoom} onChange={onWaitingRoomChange} isDisabled={creating}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Enable Waiting Room
                    </Switch.Content>
                  </Switch>
                </div>
              </>
            )}

          </form>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={creating}>
            Cancel
          </Button>
          <Button isPending={creating} type="submit" form="add-meeting-form" isDisabled={creating || !title || (!zoomAccountId && !link) || !scheduledAt} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Meeting
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── EditMeetingModal ──────────────────────────────────────────────────────────

function EditMeetingModal({ meeting, zoomAccounts, loading, onConfirm, onCancel }: {
  meeting: Meeting; zoomAccounts: ZoomAccount[]; loading: boolean;
  onConfirm: (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean) => void; onCancel: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDatetime = (d: Date | null) =>
    d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

  const [title, setTitle] = useState(meeting.title);
  const [link, setLink] = useState(meeting.link);
  const [scheduledAt, setScheduledAt] = useState(meeting.scheduledAt ? toLocalDatetime(new Date(meeting.scheduledAt)) : '');
  const [grade, setGrade] = useState<Grade | ''>(meeting.grade || '');

  const [durationMinutes, setDurationMinutes] = useState(meeting.duration || 60);
  const [isRecurring, setIsRecurring] = useState(meeting.isRecurring || false);
  const [hostVideo, setHostVideo] = useState(meeting.hostVideo || false);
  const [participantVideo, setParticipantVideo] = useState(meeting.participantVideo || false);
  const [waitingRoom, setWaitingRoom] = useState(meeting.waitingRoom !== false);

  const isZoomApi = !!meeting.zoomAccountId;

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-white">Edit Meeting</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">

          {isZoomApi && meeting.zoomAccount && (
            <div className="mb-2 text-xs font-medium text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 flex items-center gap-2">
              <Video size={14} /> Controlled by Zoom API ({meeting.zoomAccount.name})
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
              required />
          </div>

          {!isZoomApi && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Zoom Link</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
              <div className="relative">
                <select value={grade} onChange={(e) => setGrade(e.target.value as Grade | '')} disabled={loading}
                  className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                  <option value="">— All Grades —</option>
                  {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              </div>
            </div>

            <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={setScheduledAt} disabled={loading} />
          </div>

          {isZoomApi && (
            <>
              <div className="grid grid-cols-2 gap-4 border-t border-[#e8eaed] pt-4 mt-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Duration (Minutes)</label>
                  <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    disabled={loading} min={15} max={300} step={15}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                    required />
                </div>

                <div className="flex flex-col justify-center">
                  <Switch isSelected={isRecurring} onChange={setIsRecurring} isDisabled={loading}>
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                      Recurring Meeting
                    </Switch.Content>
                  </Switch>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Switch isSelected={hostVideo} onChange={setHostVideo} isDisabled={loading}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Host Video On
                  </Switch.Content>
                </Switch>
                <Switch isSelected={participantVideo} onChange={setParticipantVideo} isDisabled={loading}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Participant Video On
                  </Switch.Content>
                </Switch>
                <Switch isSelected={waitingRoom} onChange={setWaitingRoom} isDisabled={loading}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Enable Waiting Room
                  </Switch.Content>
                </Switch>
              </div>
            </>
          )}

        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} onPress={() => onConfirm(title, link, scheduledAt, grade, durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom)} isDisabled={loading || !title || (!isZoomApi && !link) || !scheduledAt} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ meeting, loading, onConfirm, onCancel }: {
  meeting: Meeting; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Delete Meeting</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">This action is irreversible</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to permanently delete <span className="font-semibold">{meeting.title}</span>?
                {meeting.zoomAccountId && " This will also delete the meeting on Zoom."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} variant='danger' onPress={onConfirm} isDisabled={loading} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Meeting
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── ManageZoomAccountsModal ───────────────────────────────────────────────────────

function ManageZoomAccountsModal({ zoomAccounts, loading, onAdd, onDelete, onCancel }: {
  zoomAccounts: ZoomAccount[]; loading: boolean;
  onAdd: (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onAdd(name, email, accountId, clientId, clientSecret);
    if (success) {
      setAdding(false);
      setName(''); setEmail(''); setAccountId(''); setClientId(''); setClientSecret('');
    }
  };

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-2xl my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-indigo-500 via-[#3949ab] to-[#283593] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Settings size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Manage Zoom Accounts</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 min-h-75">
          {adding ? (
            <form onSubmit={handleAdd} className="space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2">Add New Server-to-Server OAuth Account</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Identifier Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Host Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account ID</label>
                <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} required disabled={loading}
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onPress={() => setAdding(false)} isDisabled={loading}>Cancel</Button>
                <Button type="submit" size="sm" variant="primary" isDisabled={loading} isPending={loading}>Save Account</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-[#202124]">Configured Accounts</h3>
                <Button size="sm" variant="primary" onPress={() => setAdding(true)}>
                  <Plus size={14} /> Add Account
                </Button>
              </div>

              {zoomAccounts.length === 0 ? (
                <div className="text-center py-8 text-sm text-[#9aa0a6] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No Zoom accounts configured. Add one to use API-based meetings.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {zoomAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div>
                        <div className="text-sm font-medium text-[#202124]">{account.name}</div>
                        <div className="text-xs text-[#5f6368]">{account.email}</div>
                      </div>
                      <Button isIconOnly size="sm" variant="danger" onPress={() => onDelete(account.id)} isDisabled={loading}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tone = 'default' }: {
  label: string; value: number | string; icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'info';
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-[#f1f3f4] text-[#5f6368]',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-500',
    info: 'bg-blue-100 text-blue-500',
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[20px] font-medium leading-tight text-[#202124]">{value}</p>
        <p className="truncate text-[12px] text-[#5f6368]">{label}</p>
      </div>
    </div>
  );
}

// ─── MeetingStatusBadge ────────────────────────────────────────────────────────

function MeetingStatusBadge({ meeting }: { meeting: Meeting }) {
  if (isExpired(meeting)) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <ShieldAlert size={9} /> Expired
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <Check size={9} /> Upcoming / Active
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingsAdminPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Zoom Accounts Modals
  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [manageAccountsLoading, setManageAccountsLoading] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newGrade, setNewGrade] = useState<Grade | ''>('');

  const [newZoomAccountId, setNewZoomAccountId] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState(60);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newHostVideo, setNewHostVideo] = useState(false);
  const [newParticipantVideo, setNewParticipantVideo] = useState(false);
  const [newWaitingRoom, setNewWaitingRoom] = useState(true);

  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Modals
  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | ''>('');
  const [showExpired, setShowExpired] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeMeetings = useMemo(
    () => meetings.filter((m) => !isExpired(m)),
    [meetings],
  );
  const expiredMeetings = useMemo(
    () => meetings.filter((m) => isExpired(m)),
    [meetings],
  );

  const filterMeetings = useCallback(
    (list: Meeting[]) => {
      const q = searchQuery.trim().toLowerCase();
      return list.filter((m) => {
        const matchSearch = m.title.toLowerCase().includes(q) || m.link?.toLowerCase().includes(q);
        const matchGrade = gradeFilter ? m.grade === gradeFilter : true;
        return matchSearch && matchGrade;
      });
    },
    [searchQuery, gradeFilter],
  );

  const filteredActive = useMemo(
    () => filterMeetings(activeMeetings),
    [filterMeetings, activeMeetings],
  );
  const filteredExpired = useMemo(
    () => filterMeetings(expiredMeetings),
    [filterMeetings, expiredMeetings],
  );

  // ── API calls ─────────────────────────────────────────────────────────────

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const [meetingsRes, accountsRes] = await Promise.all([
        fetch('/api/meetings'),
        fetch('/api/zoom-accounts')
      ]);
      const data = await meetingsRes.json();
      const accountsData = await accountsRes.json();

      if (meetingsRes.ok) setMeetings(data.meetings);
      else setError(data.error || 'Failed to fetch meetings');

      if (accountsRes.ok) {
        setZoomAccounts(accountsData.accounts);
        if (accountsData.accounts.length > 0 && !newZoomAccountId) {
          setNewZoomAccountId(accountsData.accounts[0].id);
        }
      }
      else setError(accountsData.error || 'Failed to fetch accounts');
    } catch {
      setError('Connection error fetching data');
    } finally {
      setLoading(false);
    }
  }, [newZoomAccountId]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);


  const handleAddZoomAccount = async (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => {
    setManageAccountsLoading(true);
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/zoom-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, accountId, clientId, clientSecret })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Zoom account added successfully.');
        fetchMeetings();
        return true;
      } else {
        setError(data.error || 'Failed to add Zoom account');
        return false;
      }
    } catch {
      setError('Connection error adding zoom account');
      return false;
    } finally {
      setManageAccountsLoading(false);
    }
  };

  const handleDeleteZoomAccount = async (id: string) => {
    setManageAccountsLoading(true);
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/zoom-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Zoom account deleted.');
        fetchMeetings();
        return true;
      } else {
        setError('Failed to delete Zoom account');
        return false;
      }
    } catch {
      setError('Connection error deleting zoom account');
      return false;
    } finally {
      setManageAccountsLoading(false);
    }
  }


  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError(''); setSuccess('');

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          link: newZoomAccountId ? undefined : newLink,
          scheduledAt: new Date(newScheduledAt).toISOString(),
          grade: newGrade || null,
          zoomAccountId: newZoomAccountId || null,
          durationMinutes: newDurationMinutes,
          isRecurring: newIsRecurring,
          hostVideo: newHostVideo,
          participantVideo: newParticipantVideo,
          waitingRoom: newWaitingRoom
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Meeting '${newTitle}' created successfully.`);
        setNewTitle(''); setNewLink(''); setNewScheduledAt(''); setNewGrade('');
        setShowAddModal(false);
        fetchMeetings();
      } else {
        setError(data.error || 'Failed to create meeting');
      }
    } catch {
      setError('Connection error creating meeting');
    } finally {
      setCreating(false);
    }
  };

  const handleEditMeeting = async (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/meetings/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, link, scheduledAt: new Date(scheduledAt).toISOString(),
          grade: grade || null,
          durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom
        }),
      });
      if (res.ok) {
        setSuccess(`Meeting '${title}' updated.`);
        setEditTarget(null);
        fetchMeetings();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update meeting');
        setEditTarget(null);
      }
    } catch { setError('Connection error updating meeting'); setEditTarget(null); }
    finally { setEditLoading(false); }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true); setError('');
    try {
      const res = await fetch(`/api/meetings/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Meeting '${deleteTarget.title}' deleted.`);
        setDeleteTarget(null);
        fetchMeetings();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete meeting');
        setDeleteTarget(null);
      }
    } catch {
      setError('Connection error deleting meeting');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Meeting Row ──────────────────────────────────────────────────────────

  const renderMeetingRow = (meeting: Meeting) => (
    <tr key={meeting.id} className="transition-colors duration-100 hover:bg-[#f8f9fa]">
      <td className="py-3.5 pl-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-500">
            <Video size={14} />
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <span className="block text-[13px] font-medium text-[#202124] truncate">{meeting.title}</span>
            <div className="flex flex-wrap items-center gap-2">
              {meeting.zoomAccount ? (
                <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  API: {meeting.zoomAccount.name}
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                  Manual Link
                </span>
              )}
              {meeting.link && (
                <a href={meeting.link} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline flex items-center gap-1">
                  <LinkIcon size={10} /> Join Link
                </a>
              )}
              {meeting.startUrl && (
                <a href={meeting.startUrl} target="_blank" rel="noreferrer" className="text-[11px] text-green-600 hover:underline flex items-center gap-1">
                  <Video size={10} /> Start (Host)
                </a>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3.5">
        {meeting.grade ? (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GRADE_COLORS[meeting.grade]}`}>
            {GRADE_LABELS[meeting.grade]}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
            <Globe size={9} /> All Grades
          </span>
        )}
      </td>
      <td className="py-3.5">
        <div className="space-y-1">
          <MeetingStatusBadge meeting={meeting} />
          <p className="text-[10px] text-[#9aa0a6] flex items-center gap-0.5">
            <Calendar size={8} /> {formatDate(meeting.scheduledAt)}
            {meeting.duration && ` (${meeting.duration}m)`}
            {meeting.isRecurring && ` 🔁`}
          </p>
        </div>
      </td>
      <td className="py-3.5 pr-4 text-right">
        <div className="inline-flex items-center gap-1">
          {isExpired(meeting) && meeting.meetingId && (
            <button type="button" onClick={() => setEditTarget(meeting)} title="Reactivate Meeting"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-green-600 transition-colors hover:bg-green-100">
              <RefreshCw size={12} /><span>Reactivate</span>
            </button>
          )}
          <button type="button" onClick={() => setEditTarget(meeting)} title="Edit Meeting"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100">
            <span>Edit</span>
          </button>
          <button type="button" onClick={() => setDeleteTarget(meeting)} title="Delete Meeting"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100">
            <Trash size={13} /><span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {showManageAccountsModal && (
        <ManageZoomAccountsModal
          zoomAccounts={zoomAccounts}
          loading={manageAccountsLoading}
          onAdd={handleAddZoomAccount}
          onDelete={handleDeleteZoomAccount}
          onCancel={() => setShowManageAccountsModal(false)}
        />
      )}

      {showAddModal && (
        <AddMeetingModal
          title={newTitle} link={newLink} scheduledAt={newScheduledAt} grade={newGrade}
          zoomAccountId={newZoomAccountId} durationMinutes={newDurationMinutes} isRecurring={newIsRecurring} hostVideo={newHostVideo} participantVideo={newParticipantVideo} waitingRoom={newWaitingRoom} zoomAccounts={zoomAccounts}
          creating={creating} error={error} success={success}
          onTitleChange={setNewTitle}
          onLinkChange={setNewLink}
          onScheduledAtChange={setNewScheduledAt}
          onGradeChange={setNewGrade}
          onZoomAccountIdChange={setNewZoomAccountId}
          onDurationMinutesChange={setNewDurationMinutes}
          onIsRecurringChange={setNewIsRecurring}
          onHostVideoChange={setNewHostVideo}
          onParticipantVideoChange={setNewParticipantVideo}
          onWaitingRoomChange={setNewWaitingRoom}
          onSubmit={handleCreateMeeting}
          onCancel={() => setShowAddModal(false)}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal meeting={deleteTarget} loading={deleteLoading}
          onConfirm={handleDeleteMeeting}
          onCancel={() => setDeleteTarget(null)} />
      )}
      {editTarget && (
        <EditMeetingModal meeting={editTarget} zoomAccounts={zoomAccounts} loading={editLoading}
          onConfirm={handleEditMeeting}
          onCancel={() => setEditTarget(null)} />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">Zoom Meetings</h1>
              <p className="mt-1 text-sm text-[#5f6368]">Create and manage scheduled Zoom meetings</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="primary" onPress={() => setShowManageAccountsModal(true)}>
                <Settings size={16} />
                Accounts
              </Button>
              <Button type="button" variant="primary" onPress={() => setShowAddModal(true)}>
                <Plus size={16} />
                New Meeting
              </Button>
            </div>
          </div>

          {error && !showAddModal && !showManageAccountsModal && (
            <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>
          )}
          {success && !showAddModal && !showManageAccountsModal && (
            <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            <StatCard label="Total Meetings" value={meetings.length} tone="default"
              icon={<Video size={17} />} />
            <StatCard label="Upcoming / Active" value={activeMeetings.length} tone="success"
              icon={<Check size={17} />} />
            <StatCard label="Expired Meetings" value={expiredMeetings.length} tone="danger"
              icon={<ShieldAlert size={17} />} />
          </div>

          <div className="w-full">
            <div className="flex flex-col gap-6 w-full min-w-0">
              <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[15px] font-medium text-[#202124]">Active Meetings</h2>
                    {!loading && activeMeetings.length > 0 && (
                      <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                        {activeMeetings.length} total
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as Grade | '')}
                        className="appearance-none rounded-full border border-[#dadce0] bg-white py-2 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                        <option value="">All Grades</option>
                        {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                    </div>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search meetings…"
                        className="w-48 rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] transition-colors hover:text-[#202124]">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl w-full min-w-0 bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
                {loading ? (
                  <div className="flex justify-center py-14"><Loader2 className="animate-spin text-blue-500" size={26} /></div>
                ) : activeMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                      <Video size={20} className="text-[#9aa0a6]" />
                    </div>
                    <p className="text-sm text-[#5f6368]">No upcoming or active meetings.</p>
                  </div>
                ) : filteredActive.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                      <Search size={18} className="text-[#9aa0a6]" />
                    </div>
                    <p className="text-sm text-[#5f6368]">No meetings match your filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto p-0">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#e8eaed]">
                          <th className="py-2.5 pl-4 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Meeting</th>
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade Access</th>
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Schedule</th>
                          <th className="py-2.5 pr-4 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f3f4]">
                        {filteredActive.map(renderMeetingRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {expiredMeetings.length > 0 && (
                <div className="rounded-2xl w-full min-w-0 bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
                  <button type="button"
                    onClick={() => setShowExpired((v) => !v)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#f8f9fa] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                        <ShieldAlert size={15} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#202124]">Expired Meetings</p>
                        <p className="text-[11px] text-[#9aa0a6]">{expiredMeetings.length} meeting{expiredMeetings.length !== 1 ? 's' : ''} ended recently</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-[#5f6368] transition-transform duration-200 ${showExpired ? 'rotate-180' : ''}`} />
                  </button>

                  {showExpired && (
                    filteredExpired.length === 0 ? (
                      <div className="px-6 pb-6 text-sm text-[#9aa0a6]">No expired meetings match your filters.</div>
                    ) : (
                      <div className="overflow-x-auto pb-0">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#e8eaed] bg-gray-50">
                              <th className="py-2.5 pl-4 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Meeting</th>
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade Access</th>
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Schedule</th>
                              <th className="py-2.5 pr-4 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f1f3f4]">
                            {filteredExpired.map(renderMeetingRow)}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
