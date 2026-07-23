import axios from 'axios';
import { db } from './db';

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export async function getZoomAccessToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post<ZoomTokenResponse>(
    'https://zoom.us/oauth/token',
    new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }).toString(),
    {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.access_token;
}

export interface ZoomMeetingDetails {
  topic: string;
  startTime: string; // ISO 8601 format
  durationMinutes: number;
  timezone: string;
  hostVideo?: boolean;
  participantVideo?: boolean;
  waitingRoom?: boolean;
  isRecurring?: boolean;
}

export async function createZoomMeeting(
  email: string,
  accountId: string,
  clientId: string,
  clientSecret: string,
  details: ZoomMeetingDetails
) {
  const token = await getZoomAccessToken(accountId, clientId, clientSecret);

  // Type 2 is scheduled meeting, Type 8 is recurring meeting with fixed time
  const type = details.isRecurring ? 8 : 2; 

  const payload: any = {
    topic: details.topic,
    type: type,
    start_time: details.startTime,
    duration: details.durationMinutes,
    timezone: details.timezone,
    settings: {
      host_video: details.hostVideo ?? false,
      participant_video: details.participantVideo ?? false,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: details.waitingRoom ?? true,
    },
  };

  if (details.isRecurring) {
    payload.recurrence = {
      type: 2, // Weekly
      repeat_interval: 1,
      weekly_days: "1,2,3,4,5,6,7",
      end_times: 50 // Max occurrences
    };
  }

  const response = await axios.post(
    `https://api.zoom.us/v2/users/${email}/meetings`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    meetingId: response.data.id.toString(),
    joinUrl: response.data.join_url,
    startUrl: response.data.start_url,
    password: response.data.password,
  };
}

export async function updateZoomMeeting(
  meetingId: string,
  accountId: string,
  clientId: string,
  clientSecret: string,
  updatedDetails: Partial<ZoomMeetingDetails>
) {
  const token = await getZoomAccessToken(accountId, clientId, clientSecret);

  const payload: any = {};
  if (updatedDetails.topic) payload.topic = updatedDetails.topic;
  if (updatedDetails.startTime) payload.start_time = updatedDetails.startTime;
  if (updatedDetails.durationMinutes) payload.duration = updatedDetails.durationMinutes;
  if (updatedDetails.timezone) payload.timezone = updatedDetails.timezone;
  if (updatedDetails.isRecurring !== undefined) payload.type = updatedDetails.isRecurring ? 8 : 2;
  
  if (Object.keys(updatedDetails).some(k => ['hostVideo', 'participantVideo', 'waitingRoom'].includes(k))) {
      payload.settings = {};
      if (updatedDetails.hostVideo !== undefined) payload.settings.host_video = updatedDetails.hostVideo;
      if (updatedDetails.participantVideo !== undefined) payload.settings.participant_video = updatedDetails.participantVideo;
      if (updatedDetails.waitingRoom !== undefined) payload.settings.waiting_room = updatedDetails.waitingRoom;
  }

  await axios.patch(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return { success: true, message: "Meeting updated successfully" };
}

export async function deleteZoomMeeting(
  meetingId: string,
  accountId: string,
  clientId: string,
  clientSecret: string
) {
  const token = await getZoomAccessToken(accountId, clientId, clientSecret);

  await axios.delete(
    `https://api.zoom.us/v2/meetings/${meetingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return { success: true, message: "Meeting deleted successfully" };
}
