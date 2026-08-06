'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash,
  X,
  ChevronDown,
  Globe,
  ShieldAlert,
  Calendar,
  Video,
  Settings,
  Link as LinkIcon,
  Repeat,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { notoSans } from '@/lib/fonts';
import ShareMeetingModal from '@/components/ShareMeetingModal';
import AddMeetingModal from '@/components/AddMeetingModal';
import { Grade } from '@/lib/db';
import EditMeetingModal from '@/components/EditMeetingModal';
import ZoomAccountmDeleteConfirmModal from '@/components/ZoomAccountmDeleteConfirmModal';
import ManageZoomAccountsModal from '@/components/ManageZoomAccountsModal';
import StatCard from '@/components/StatCard';
import { GRADE_COLORS, GRADE_LABELS } from '@/lib/constants';
import { triggerUnauthorized } from '@/lib/utils';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isExpired = (meeting: Meeting): boolean => {
  const scheduled = new Date(meeting.scheduledAt);
  const now = new Date();
  const durationMs = (meeting.duration || 40) * 60 * 1000;
  return now.getTime() - scheduled.getTime() > (durationMs + 60 * 60 * 1000);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Colombo',
  });
}

function MeetingStatusBadge({ meeting }: { meeting: Meeting }) {
  if (isExpired(meeting)) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <ShieldAlert size={9} /> Expired
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <Check size={9} /> Upcoming
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_RECURRENCE: RecurrenceConfig = { type: 2, repeat_interval: 1, weekly_days: String(new Date().getDay() + 1), end_times: 50 };

const MeetingsAdminPage = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [manageAccountsLoading, setManageAccountsLoading] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newGrade, setNewGrade] = useState<Grade | ''>('');
  const [newZoomAccountId, setNewZoomAccountId] = useState('');
  const hasAutoSelectedAccount = useRef(false);
  const [newDurationMinutes, setNewDurationMinutes] = useState(40);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newHostVideo, setNewHostVideo] = useState(false);
  const [newParticipantVideo, setNewParticipantVideo] = useState(false);
  const [newWaitingRoom, setNewWaitingRoom] = useState(false);
  const [newRecurrenceConfig, setNewRecurrenceConfig] = useState<RecurrenceConfig>(DEFAULT_RECURRENCE);

  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | ''>('');
  const [showExpired, setShowExpired] = useState(false);

  // Share popover state
  const [shareTarget, setShareTarget] = useState<Meeting | null>(null);

  const activeMeetings = useMemo(() => meetings.filter((m) => !isExpired(m)), [meetings]);
  const expiredMeetings = useMemo(() => meetings.filter((m) => isExpired(m)), [meetings]);

  const filterMeetings = useCallback((list: Meeting[]) => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((m) => {
      const matchSearch = m.title.toLowerCase().includes(q) || m.link?.toLowerCase().includes(q);
      const matchGrade = gradeFilter ? m.grade === gradeFilter : true;
      return matchSearch && matchGrade;
    });
  }, [searchQuery, gradeFilter]);

  const filteredActive = useMemo(() => filterMeetings(activeMeetings), [filterMeetings, activeMeetings]);
  const filteredExpired = useMemo(() => filterMeetings(expiredMeetings), [filterMeetings, expiredMeetings]);

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
      else if (meetingsRes.status === 401) { triggerUnauthorized(); }
      else setError(data.error || 'Failed to fetch meetings');
      if (accountsRes.ok) {
        setZoomAccounts(accountsData.accounts);
        // Auto-select the first Zoom account only once on initial mount.
        // After that, the user's selection (including "Manual Link") is respected.
        if (accountsData.accounts.length > 0 && !hasAutoSelectedAccount.current) {
          hasAutoSelectedAccount.current = true;
          setNewZoomAccountId(accountsData.accounts[0].id);
        }
      } else if (accountsRes.status === 401) { triggerUnauthorized(); }
      else setError(accountsData.error || 'Failed to fetch accounts');
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); } }, [error]);

  const handleAddZoomAccount = async (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => {
    setManageAccountsLoading(true);
    try {
      const res = await fetch('/api/zoom-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, accountId, clientId, clientSecret }) });
      const data = await res.json();
      if (res.ok) { setSuccess('Account added.'); fetchMeetings(); return true; }
      if (res.status === 401) { triggerUnauthorized(); return false; }
      setError(data.error || 'Failed to add account'); return false;
    } catch { setError('Connection error'); return false; }
    finally { setManageAccountsLoading(false); }
  };

  const handleDeleteZoomAccount = async (id: string) => {
    setManageAccountsLoading(true);
    try {
      const res = await fetch(`/api/zoom-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) { setSuccess('Account deleted.'); fetchMeetings(); return true; }
      if (res.status === 401) { triggerUnauthorized(); return false; }
      setError('Failed to delete account'); return false;
    } catch { setError('Connection error'); return false; }
    finally { setManageAccountsLoading(false); }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError('');
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
          recurrenceConfig: newIsRecurring ? newRecurrenceConfig : undefined,
          hostVideo: newHostVideo,
          participantVideo: newParticipantVideo,
          waitingRoom: newWaitingRoom,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Meeting '${newTitle}' created.`);
        setNewTitle(''); setNewLink(''); setNewScheduledAt(''); setNewGrade('');
        setShowAddModal(false); fetchMeetings();
      } else if (res.status === 401) {
        triggerUnauthorized();
      } else setError(data.error || 'Failed to create meeting');
    } catch { setError('Connection error'); }
    finally { setCreating(false); }
  };

  const handleEditMeeting = async (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean, recurrenceConfig: RecurrenceConfig) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/meetings/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, link, scheduledAt: new Date(scheduledAt).toISOString(), grade: grade || null, durationMinutes, isRecurring, recurrenceConfig: isRecurring ? recurrenceConfig : undefined, hostVideo, participantVideo, waitingRoom }),
      });
      if (res.ok) { setSuccess(`Meeting updated.`); setEditTarget(null); fetchMeetings(); }
      else if (res.status === 401) { triggerUnauthorized(); setEditTarget(null); }
      else { const d = await res.json(); setError(d.error || 'Failed to update'); setEditTarget(null); }
    } catch { setError('Connection error'); setEditTarget(null); }
    finally { setEditLoading(false); }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/meetings/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setSuccess(`Meeting deleted.`); setDeleteTarget(null); fetchMeetings(); }
      else if (res.status === 401) { triggerUnauthorized(); setDeleteTarget(null); }
      else { const d = await res.json(); setError(d.error || 'Failed to delete'); setDeleteTarget(null); }
    } catch { setError('Connection error'); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  const renderMeetingRow = (meeting: Meeting) => (
    <tr key={meeting.id} className="transition-colors duration-100 hover:bg-[#f8f9fa]">
      <td className="py-3.5 pl-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Video size={14} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[13px] font-medium text-[#202124] truncate ${notoSans.className}`}>{meeting.title}</span>
              {meeting.isRecurring && <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"><Repeat size={8} /> Recurring</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {meeting.zoomAccount ? (
                <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">API: {meeting.zoomAccount.name}</span>
              ) : (
                <span className="inline-flex items-center text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Manual Link</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3.5">
        {meeting.grade ? (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GRADE_COLORS[meeting.grade]}`}>{GRADE_LABELS[meeting.grade]}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"><Globe size={9} /> All</span>
        )}
      </td>
      <td className="py-3.5">
        <div className="space-y-1">
          <MeetingStatusBadge meeting={meeting} />
          <p className="text-[10px] text-[#9aa0a6] flex items-center gap-0.5">
            <Calendar size={8} /> {formatDate(meeting.scheduledAt)}
            {meeting.duration && ` · ${meeting.duration}m`}
          </p>
        </div>
      </td>
      <td className="py-3.5 pr-4">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {/* Share button */}
          {meeting.link && (
            <div className="relative">
              <button type="button"
                onClick={() => setShareTarget(shareTarget?.id === meeting.id ? null : meeting)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
                <LinkIcon size={11} /> Share
              </button>
              {shareTarget?.id === meeting.id && (
                <ShareMeetingModal meeting={meeting} onClose={() => setShareTarget(null)} />
              )}
            </div>
          )}
          {isExpired(meeting) && meeting.meetingId && (
            <button type="button" onClick={() => setEditTarget(meeting)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-green-600 hover:bg-green-100 transition-colors">
              <RefreshCw size={11} /> Reactivate
            </button>
          )}
          <button type="button" onClick={() => setEditTarget(meeting)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-blue-500 hover:bg-blue-100 transition-colors">
            Edit
          </button>
          <button type="button" onClick={() => setDeleteTarget(meeting)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-colors">
            <Trash size={11} /> Delete
          </button>
        </div>
      </td>
    </tr>
  );

  const renderMeetingTable = (rows: Meeting[]) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            <th className="py-2.5 pl-4 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Meeting</th>
            <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade</th>
            <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Schedule</th>
            <th className="py-2.5 pr-4 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f3f4]">{rows.map(renderMeetingRow)}</tbody>
      </table>
    </div>
  );

  return (
    <>
      {showManageAccountsModal && (
        <ManageZoomAccountsModal zoomAccounts={zoomAccounts} loading={manageAccountsLoading}
          onAdd={handleAddZoomAccount} onDelete={handleDeleteZoomAccount}
          onCancel={() => setShowManageAccountsModal(false)} />
      )}
      {showAddModal && (
        <AddMeetingModal
          title={newTitle} link={newLink} scheduledAt={newScheduledAt} grade={newGrade}
          zoomAccountId={newZoomAccountId} durationMinutes={newDurationMinutes}
          isRecurring={newIsRecurring} hostVideo={newHostVideo} participantVideo={newParticipantVideo}
          waitingRoom={newWaitingRoom} recurrenceConfig={newRecurrenceConfig}
          zoomAccounts={zoomAccounts} creating={creating} error={error} success={success}
          onTitleChange={setNewTitle} onLinkChange={setNewLink}
          onScheduledAtChange={setNewScheduledAt} onGradeChange={setNewGrade}
          onZoomAccountIdChange={setNewZoomAccountId} onDurationMinutesChange={setNewDurationMinutes}
          onIsRecurringChange={setNewIsRecurring} onHostVideoChange={setNewHostVideo}
          onParticipantVideoChange={setNewParticipantVideo} onWaitingRoomChange={setNewWaitingRoom}
          onRecurrenceConfigChange={setNewRecurrenceConfig}
          onSubmit={handleCreateMeeting} onCancel={() => setShowAddModal(false)} />
      )}
      {deleteTarget && (
        <ZoomAccountmDeleteConfirmModal targetName={deleteTarget.title} zoomAccountLinked={!!deleteTarget.zoomAccountId}
          loading={deleteLoading} onConfirm={handleDeleteMeeting} onCancel={() => setDeleteTarget(null)} />
      )}
      {editTarget && (
        <EditMeetingModal meeting={editTarget} loading={editLoading}
          onConfirm={handleEditMeeting} onCancel={() => setEditTarget(null)} />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">Zoom Meetings</h1>
              <p className="mt-1 text-sm text-[#5f6368]">Create and manage scheduled Zoom meetings for your classes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                onPress={() => setShowManageAccountsModal(true)}>
                <Settings size={15} /> Accounts
              </Button>
              <Button type="button" variant="primary" onPress={() => setShowAddModal(true)}>
                <Plus size={15} /> New Meeting
              </Button>
            </div>
          </div>

          {/* Global toasts */}
          {error && !showAddModal && !showManageAccountsModal && (
            <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] text-[#c5221f]">{error}</div>
          )}
          {success && !showAddModal && !showManageAccountsModal && (
            <div className="rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] text-[#137333]">{success}</div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Meetings" value={meetings.length} tone="default" icon={<Video size={17} />} />
            <StatCard label="Upcoming" value={activeMeetings.length} tone="success" icon={<Check size={17} />} />
            <StatCard label="Expired" value={expiredMeetings.length} tone="danger" icon={<ShieldAlert size={17} />} />
          </div>

          {/* Filters bar */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-[#202124]">Active Meetings</h2>
                {!loading && activeMeetings.length > 0 && (
                  <span className="rounded-full bg-[#f1f3f4] px-2.5 py-0.5 text-xs font-medium text-[#5f6368]">{activeMeetings.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as Grade | '')}
                    className="appearance-none rounded-full border border-[#dadce0] bg-white py-2 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">All Grades</option>
                    {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search meetings…"
                    className="w-44 rounded-full border border-[#dadce0] bg-white py-2 pl-8 pr-7 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124]">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active meetings table */}
          <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
            {loading ? (
              <div className="flex justify-center py-14"><Loader2 className="animate-spin text-blue-500" size={26} /></div>
            ) : filteredActive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                  <Video size={20} className="text-[#9aa0a6]" />
                </div>
                <p className="text-sm text-[#5f6368]">{activeMeetings.length === 0 ? 'No upcoming meetings.' : 'No meetings match your filters.'}</p>
              </div>
            ) : (
              renderMeetingTable(filteredActive)
            )}
          </div>

          {/* Expired meetings collapsible */}
          {expiredMeetings.length > 0 && (
            <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
              <button type="button" onClick={() => setShowExpired((v) => !v)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                    <ShieldAlert size={15} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#202124]">Expired Meetings</p>
                    <p className="text-[11px] text-[#9aa0a6]">{expiredMeetings.length} meeting{expiredMeetings.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-[#5f6368] transition-transform duration-200 ${showExpired ? 'rotate-180' : ''}`} />
              </button>
              {showExpired && (
                filteredExpired.length === 0
                  ? <div className="px-6 pb-6 text-sm text-[#9aa0a6]">No expired meetings match your filters.</div>
                  : renderMeetingTable(filteredExpired)
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default MeetingsAdminPage;
