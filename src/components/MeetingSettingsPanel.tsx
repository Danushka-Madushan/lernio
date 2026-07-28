// ─── MeetingSettingsPanel ──────────────────────────────────────────────────────

import { Switch } from '@heroui/react';
import RecurrencePanel from './RecurrencePanel';

// 1=Daily, 2=Weekly, 3=Monthly
type RecurrenceType = 1 | 2 | 3;

interface RecurrenceConfig {
  type: RecurrenceType;
  repeat_interval: number;
  weekly_days?: string; // comma-separated "1"=Sun "2"=Mon ... "7"=Sat
  end_times?: number;
}

function MeetingSettingsPanel({
  scheduledAt,
  durationMinutes, onDurationChange,
  hostVideo, onHostVideoChange,
  participantVideo, onParticipantVideoChange,
  waitingRoom, onWaitingRoomChange,
  isRecurring, onIsRecurringChange,
  recurrenceConfig, onRecurrenceConfigChange,
  disabled,
}: {
  scheduledAt: string;
  durationMinutes: number; onDurationChange: (v: number) => void;
  hostVideo: boolean; onHostVideoChange: (v: boolean) => void;
  participantVideo: boolean; onParticipantVideoChange: (v: boolean) => void;
  waitingRoom: boolean; onWaitingRoomChange: (v: boolean) => void;
  isRecurring: boolean; onIsRecurringChange: (v: boolean) => void;
  recurrenceConfig: RecurrenceConfig; onRecurrenceConfigChange: (c: RecurrenceConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Meeting Settings</h4>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Duration:</label>
          <input type="number" value={durationMinutes}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 40)}
            disabled={disabled} min={15} max={40} step={5}
            className="w-14 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-blue-500/20" />
          <span className="text-xs text-gray-500">min</span>
        </div>
      </div>

      {/* Switches in 2-col grid */}
      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2.5">
        <Switch isSelected={hostVideo} onChange={onHostVideoChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Host Video
          </Switch.Content>
        </Switch>
        <Switch isSelected={participantVideo} onChange={onParticipantVideoChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Student Video
          </Switch.Content>
        </Switch>
        <Switch isSelected={waitingRoom} onChange={onWaitingRoomChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Waiting Room
          </Switch.Content>
        </Switch>
        <Switch isSelected={isRecurring} onChange={onIsRecurringChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Repeat
          </Switch.Content>
        </Switch>
      </div>

      {/* Recurrence config panel */}
      {isRecurring && (
        <RecurrencePanel
          scheduledAt={scheduledAt}
          config={recurrenceConfig}
          onChange={onRecurrenceConfigChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export default MeetingSettingsPanel;
