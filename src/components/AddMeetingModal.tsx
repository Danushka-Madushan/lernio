"use client";

import { ChevronDown, Loader2, Plus, Video, X } from 'lucide-react';
import DateTimePicker from './DateTimePicker';
import MeetingSettingsPanel from './MeetingSettingsPanel';
import { Button } from '@heroui/react';
import { notoSans } from '@/lib/fonts';
import { Grade } from '@/lib/db';
import { GRADE_LABELS } from '@/lib/constants';

// 1=Daily, 2=Weekly, 3=Monthly
type RecurrenceType = 1 | 2 | 3;

interface RecurrenceConfig {
  type: RecurrenceType;
  repeat_interval: number;
  weekly_days?: string; // comma-separated "1"=Sun "2"=Mon ... "7"=Sat
  end_times?: number;
}

interface ZoomAccount {
  id: string;
  name: string;
  email: string;
  accountId: string;
  clientId: string;
  picUrl?: string | null;
}

const AddMeetingModal = ({
  title, link, scheduledAt, grade, zoomAccountId,
  durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom,
  recurrenceConfig, zoomAccounts, creating, error, success,
  onTitleChange, onLinkChange, onScheduledAtChange, onGradeChange, onZoomAccountIdChange,
  onDurationMinutesChange, onIsRecurringChange, onHostVideoChange, onParticipantVideoChange,
  onWaitingRoomChange, onRecurrenceConfigChange, onSubmit, onCancel,
}: {
  title: string; link: string; scheduledAt: string; grade: Grade | ''; zoomAccountId: string;
  durationMinutes: number; isRecurring: boolean; hostVideo: boolean; participantVideo: boolean;
  waitingRoom: boolean; recurrenceConfig: RecurrenceConfig; zoomAccounts: ZoomAccount[];
  creating: boolean; error: string; success: string;
  onTitleChange: (v: string) => void; onLinkChange: (v: string) => void;
  onScheduledAtChange: (v: string) => void; onGradeChange: (v: Grade | '') => void;
  onZoomAccountIdChange: (v: string) => void; onDurationMinutesChange: (v: number) => void;
  onIsRecurringChange: (v: boolean) => void; onHostVideoChange: (v: boolean) => void;
  onParticipantVideoChange: (v: boolean) => void; onWaitingRoomChange: (v: boolean) => void;
  onRecurrenceConfigChange: (c: RecurrenceConfig) => void;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void;
}) => {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}>
      <div className={`w-full ${zoomAccountId ? 'max-w-4xl' : 'max-w-lg'} my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300`}>
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="flex items-center justify-between">
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
          {error && <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>}
          {success && <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>}

          <form id="add-meeting-form" onSubmit={onSubmit} className={`grid gap-6 ${zoomAccountId ? 'md:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account <span className="font-normal text-[#9aa0a6]">(Host)</span></label>
                <div className="relative">
                  <select value={zoomAccountId} onChange={(e) => onZoomAccountIdChange(e.target.value)} disabled={creating}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">- Manual Link (No API) -</option>
                    {zoomAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
                <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)}
                  disabled={creating} placeholder="e.g. Science Class - Chapter 4"
                  className={`w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 ${notoSans.className}`}
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
                      <option value="">- All Grades -</option>
                      {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                  </div>
                </div>
                <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={onScheduledAtChange} disabled={creating} />
              </div>
            </div>

            {zoomAccountId && (
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0">
                <MeetingSettingsPanel
                  scheduledAt={scheduledAt}
                  durationMinutes={durationMinutes} onDurationChange={onDurationMinutesChange}
                  hostVideo={hostVideo} onHostVideoChange={onHostVideoChange}
                  participantVideo={participantVideo} onParticipantVideoChange={onParticipantVideoChange}
                  waitingRoom={waitingRoom} onWaitingRoomChange={onWaitingRoomChange}
                  isRecurring={isRecurring} onIsRecurringChange={onIsRecurringChange}
                  recurrenceConfig={recurrenceConfig} onRecurrenceConfigChange={onRecurrenceConfigChange}
                  disabled={creating}
                />
              </div>
            )}
          </form>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={creating}>Cancel</Button>
          <Button isPending={creating} type="submit" form="add-meeting-form" variant="primary"
            isDisabled={creating || !title || (!zoomAccountId && !link) || !scheduledAt}>
            {({ isPending }) => (<>{isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Meeting</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddMeetingModal;
