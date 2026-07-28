"use client";

import { Grade } from '@/lib/db';
import { Check, ChevronDown, Loader2, Video, X } from 'lucide-react';
import { useState } from 'react';
import DateTimePicker from './DateTimePicker';
import MeetingSettingsPanel from './MeetingSettingsPanel';
import { Button } from '@heroui/react';
import { notoSans } from '@/lib/fonts';
import { GRADE_LABELS } from '@/lib/constants';

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

// 1=Daily, 2=Weekly, 3=Monthly
type RecurrenceType = 1 | 2 | 3;

interface RecurrenceConfig {
  type: RecurrenceType;
  repeat_interval: number;
  weekly_days?: string; // comma-separated "1"=Sun "2"=Mon ... "7"=Sat
  end_times?: number;
}

const EditMeetingModal = ({ meeting, loading, onConfirm, onCancel }: {
  meeting: Meeting; loading: boolean;
  onConfirm: (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean, recurrenceConfig: RecurrenceConfig) => void;
  onCancel: () => void;
}) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState(meeting.title);
  const [link, setLink] = useState(meeting.link || '');
  const [scheduledAt, setScheduledAt] = useState(meeting.scheduledAt ? toLocal(new Date(meeting.scheduledAt)) : '');
  const [grade, setGrade] = useState<Grade | ''>(meeting.grade || '');
  const [durationMinutes, setDurationMinutes] = useState(meeting.duration || 40);
  const [isRecurring, setIsRecurring] = useState(meeting.isRecurring || false);
  const [hostVideo, setHostVideo] = useState(meeting.hostVideo || false);
  const [participantVideo, setParticipantVideo] = useState(meeting.participantVideo || false);
  const [waitingRoom, setWaitingRoom] = useState(meeting.waitingRoom !== false);
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({ type: 2, repeat_interval: 1, weekly_days: String(new Date(meeting.scheduledAt).getDay() + 1), end_times: 50 });

  const isZoomApi = !!meeting.zoomAccountId;

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className={`w-full ${isZoomApi ? 'max-w-4xl' : 'max-w-lg'} my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300`}>
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-white">Edit Meeting</span>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className={`grid gap-6 ${isZoomApi ? 'md:grid-cols-[1fr_360px]' : 'grid-cols-1'}`}>
            <div className="space-y-4">
              {isZoomApi && meeting.zoomAccount && (
                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
                  <Video size={14} /> API-controlled via {meeting.zoomAccount.name}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading}
                  className={`w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 ${notoSans.className}`}
                  required />
              </div>

              {!isZoomApi && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Zoom Link</label>
                  <input type="text" value={link} onChange={(e) => setLink(e.target.value)} disabled={loading}
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
                      <option value="">- All Grades -</option>
                      {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                  </div>
                </div>
                <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={setScheduledAt} disabled={loading} />
              </div>
            </div>

            {isZoomApi && (
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 pt-4 md:pt-0">
                <MeetingSettingsPanel
                  scheduledAt={scheduledAt}
                  durationMinutes={durationMinutes} onDurationChange={setDurationMinutes}
                  hostVideo={hostVideo} onHostVideoChange={setHostVideo}
                  participantVideo={participantVideo} onParticipantVideoChange={setParticipantVideo}
                  waitingRoom={waitingRoom} onWaitingRoomChange={setWaitingRoom}
                  isRecurring={isRecurring} onIsRecurringChange={setIsRecurring}
                  recurrenceConfig={recurrenceConfig} onRecurrenceConfigChange={setRecurrenceConfig}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>Cancel</Button>
          <Button isPending={loading} variant="primary"
            onPress={() => onConfirm(title, link, scheduledAt, grade, durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom, recurrenceConfig)}
            isDisabled={loading || !title || (!isZoomApi && !link) || !scheduledAt}>
            {({ isPending }) => (<>{isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EditMeetingModal;
