import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Flame,
  Heart,
  History,
  Home,
  Leaf,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type View = 'today' | 'history';
type Profile = {
  id: string;
  displayName: string;
  initials: string;
  accentColor: string;
  weeklyHoursTarget: number;
  weeklyShowUpTarget: number;
};
type StudyEntry = {
  id: string;
  profileId: string;
  durationMinutes: number;
  studyDate: string;
  createdAt: string;
  updatedAt: string;
};
type Household = {
  id: string;
  name: string;
  weekStartsOn: 'monday';
  createdAt: string;
};
type TrackerData = {
  household: Household;
  profiles: Profile[];
  entries: StudyEntry[];
  dismissedCelebrations: string[];
};
type DailyLevel = {
  key: 'none' | 'started' | 'showed' | 'focused' | 'strong';
  icon: string;
  label: string;
  emphasis: string;
  fill: number;
};

const storageKey = 'couple-study-tracker-v1';
const activeProfileStorageKey = 'couple-study-tracker-active-profile-v1';
const trackerCloudId = 'mansi-dev-study-tracker';
const todayId = toDateId(new Date());

const defaultProfiles: Profile[] = [
  {
    id: 'mansi',
    displayName: 'Mansi',
    initials: 'M',
    accentColor: '#c26a5a',
    weeklyHoursTarget: 14,
    weeklyShowUpTarget: 5,
  },
  {
    id: 'partner',
    displayName: 'Dev',
    initials: 'D',
    accentColor: '#4f8f7b',
    weeklyHoursTarget: 14,
    weeklyShowUpTarget: 5,
  },
];

function createDefaultData(withSample = false): TrackerData {
  const now = new Date();
  const monday = getWeekStart(now);
  const entries: StudyEntry[] = withSample
    ? [
        makeEntry('mansi', 30, addDays(monday, 0)),
        makeEntry('mansi', 15, addDays(monday, 1)),
        makeEntry('mansi', 120, addDays(monday, 2)),
        makeEntry('partner', 45, addDays(monday, 0)),
        makeEntry('partner', 90, addDays(monday, 2)),
      ]
    : [];

  return {
    household: {
      id: crypto.randomUUID(),
      name: 'Our study rhythm',
      weekStartsOn: 'monday',
      createdAt: now.toISOString(),
    },
    profiles: defaultProfiles,
    entries,
    dismissedCelebrations: [],
  };
}

function makeEntry(profileId: string, minutes: number, date: Date): StudyEntry {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    profileId,
    durationMinutes: minutes,
    studyDate: toDateId(date),
    createdAt: now,
    updatedAt: now,
  };
}

function toDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromId(dateId: string) {
  return new Date(`${dateId}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekDays(date: Date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function minutesFor(entries: StudyEntry[], profileId: string, dateId: string) {
  return entries
    .filter((entry) => entry.profileId === profileId && entry.studyDate === dateId)
    .reduce((total, entry) => total + entry.durationMinutes, 0);
}

function levelFor(minutes: number): DailyLevel {
  if (minutes >= 240) {
    return {
      key: 'strong',
      icon: '🔥🔥🔥',
      label: 'Strong day',
      emphasis: 'fully filled',
      fill: 100,
    };
  }
  if (minutes >= 120) {
    return {
      key: 'focused',
      icon: '🔥🔥',
      label: 'Focused day',
      emphasis: 'two-thirds filled',
      fill: 66,
    };
  }
  if (minutes >= 30) {
    return {
      key: 'showed',
      icon: '🔥',
      label: 'Showed up',
      emphasis: 'one-third filled',
      fill: 38,
    };
  }
  if (minutes > 0) {
    return {
      key: 'started',
      icon: '🌱',
      label: 'Started',
      emphasis: 'subtle fill',
      fill: 18,
    };
  }
  return {
    key: 'none',
    icon: '○',
    label: 'No study yet',
    emphasis: 'empty',
    fill: 0,
  };
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function formatTimerSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, '0');
  const secondText = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${hours}:${minuteText}:${secondText}`
    : `${minuteText}:${secondText}`;
}

function weeklyStats(entries: StudyEntry[], profile: Profile, weekDate: Date) {
  const days = getWeekDays(weekDate);
  const dayRows = days.map((day) => {
    const dateId = toDateId(day);
    const minutes = minutesFor(entries, profile.id, dateId);
    return { date: day, dateId, minutes, level: levelFor(minutes) };
  });
  const totalMinutes = dayRows.reduce((total, day) => total + day.minutes, 0);
  const showUpDays = dayRows.filter((day) => day.minutes >= 30).length;
  return { dayRows, totalMinutes, showUpDays };
}

function streakStats(entries: StudyEntry[], profileId: string, fromDate = new Date()) {
  const entryDates = new Set(
    entries
      .filter((entry) => entry.profileId === profileId)
      .map((entry) => entry.studyDate),
  );
  const showUpDates = new Set(
    Array.from(entryDates).filter(
      (dateId) => minutesFor(entries, profileId, dateId) >= 30,
    ),
  );
  let currentRun = 0;
  let cursor = new Date(fromDate);

  while (showUpDates.has(toDateId(cursor))) {
    currentRun += 1;
    cursor = addDays(cursor, -1);
  }

  const sortedDates = Array.from(showUpDates).sort();
  let bestRun = 0;
  let activeRun = 0;
  let previousDate: Date | null = null;

  sortedDates.forEach((dateId) => {
    const date = dateFromId(dateId);
    const isConsecutive =
      previousDate && toDateId(addDays(previousDate, 1)) === dateId;
    activeRun = isConsecutive ? activeRun + 1 : 1;
    bestRun = Math.max(bestRun, activeRun);
    previousDate = date;
  });

  return { currentRun, bestRun };
}

function loadData(): TrackerData {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return createDefaultData(false);
    const parsed = JSON.parse(stored) as TrackerData;
    if (!parsed.profiles?.length || !Array.isArray(parsed.entries)) {
      return createDefaultData(false);
    }
    return normalizeTrackerData(parsed);
  } catch {
    return createDefaultData(false);
  }
}

function normalizeTrackerData(parsed: TrackerData): TrackerData {
  if (!parsed.profiles?.length || !Array.isArray(parsed.entries)) {
    return createDefaultData(false);
  }

  return {
    ...parsed,
    profiles: parsed.profiles.map((profile) =>
      profile.id === 'partner' &&
      (profile.displayName === 'Partner' || profile.displayName === 'P')
        ? { ...profile, displayName: 'Dev', initials: 'D' }
        : profile,
    ),
    dismissedCelebrations: Array.isArray(parsed.dismissedCelebrations)
      ? parsed.dismissedCelebrations
      : [],
  };
}

function saveData(data: TrackerData) {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

async function loadCloudData() {
  if (!hasSupabaseConfig) {
    return { data: null, updatedAt: null, error: null };
  }

  const { data, error } = await supabase
    .from('tracker_state')
    .select('data, updated_at')
    .eq('id', trackerCloudId)
    .maybeSingle();

  if (error) {
    return { data: null, updatedAt: null, error };
  }

  return {
    data: data?.data ? normalizeTrackerData(data.data as TrackerData) : null,
    updatedAt: data?.updated_at ?? null,
    error: null,
  };
}

async function saveCloudData(data: TrackerData) {
  if (!hasSupabaseConfig) {
    return { updatedAt: null, error: null };
  }

  const { data: saved, error } = await supabase
    .from('tracker_state')
    .upsert(
      {
        id: trackerCloudId,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('updated_at')
    .single();

  return { updatedAt: saved?.updated_at ?? null, error };
}

function loadActiveProfileId(profiles: Profile[]) {
  try {
    const stored = localStorage.getItem(activeProfileStorageKey);
    if (stored && profiles.some((profile) => profile.id === stored)) {
      return stored;
    }
  } catch {
    return profiles[0]?.id ?? 'mansi';
  }

  return profiles[0]?.id ?? 'mansi';
}

function saveActiveProfileId(profileId: string) {
  try {
    localStorage.setItem(activeProfileStorageKey, profileId);
  } catch {
    // The app still works if browser storage is unavailable.
  }
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function guidance(remainingMinutes: number, showUpsRemaining: number, daysRemaining: number) {
  if (remainingMinutes <= 0 && showUpsRemaining <= 0) {
    return 'Both weekly goals are complete. Keep it gentle from here.';
  }
  if (showUpsRemaining === 1) {
    return 'One more show-up day will complete your consistency goal.';
  }
  if (remainingMinutes > 0) {
    return `${formatMinutes(remainingMinutes)} remaining this week. A little progress today still counts.`;
  }
  return `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining this week.`;
}

function encouragementFor(minutes: number, total: number) {
  if (total >= 240) return 'Strong day reached. Keep the rest spacious.';
  if (total >= 120) return 'Focused day reached 🔥🔥';
  if (total >= 30) return 'You showed up today 🔥';
  return `Added ${formatMinutes(minutes)}. A small session still counts.`;
}

function todaySupportText(minutes: number) {
  if (minutes >= 240) return 'Strong day. You can let enough be enough.';
  if (minutes >= 120) return 'Focused day. The habit is well protected.';
  if (minutes >= 30) return 'You showed up. Anything more is extra care.';
  if (minutes > 0) return `${formatMinutes(30 - minutes)} more will mark today as showed up.`;
  return 'One tap is enough to begin.';
}

function showUpProgress(minutes: number) {
  return Math.min((minutes / 30) * 100, 100);
}

function ProgressCircle({
  day,
  accent,
  compact = false,
}: {
  day: { date: Date; dateId: string; minutes: number; level: DailyLevel };
  accent: string;
  compact?: boolean;
}) {
  const isToday = day.dateId === todayId;
  const label = day.date.toLocaleDateString('en-IN', { weekday: 'short' });
  return (
    <div className="grid min-w-0 justify-items-center gap-2 text-center">
      <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-stone-500">
        {label}
      </span>
      <div
        role="img"
        aria-label={`${label}: ${day.level.label}, ${formatMinutes(day.minutes)} studied`}
        className={`relative grid place-items-center overflow-hidden rounded-full border-2 bg-white shadow-sm transition ${
          compact ? 'size-11' : 'size-14 sm:size-16'
        } ${day.level.key === 'strong' ? 'shadow-[0_0_20px_rgba(194,106,90,0.28)]' : ''}`}
        style={{ borderColor: isToday ? accent : 'rgba(120,113,108,0.22)' }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 transition-all"
          style={{ height: `${day.level.fill}%`, backgroundColor: `${accent}24` }}
        />
        <span className="relative text-sm sm:text-base">{day.level.icon}</span>
      </div>
      <span className="text-xs font-bold text-stone-600">
        {day.minutes ? formatMinutes(day.minutes) : '-'}
      </span>
    </div>
  );
}

function ProgressBar({ value, max, accent }: { value: number; max: number; accent: string }) {
  const pct = max <= 0 ? 0 : Math.min((value / max) * 100, 100);
  return (
    <div className="h-3 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: accent }}
      />
    </div>
  );
}

function ProfilePill({
  profile,
  active,
  onClick,
}: {
  profile: Profile;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-2 rounded-full border px-2 py-1 pr-4 font-bold transition ${
        active ? 'bg-white shadow-sm' : 'bg-white/50 text-stone-600 hover:bg-white'
      }`}
      style={{ borderColor: active ? profile.accentColor : 'rgba(120,113,108,0.22)' }}
    >
      <span
        className="grid size-8 place-items-center rounded-full text-sm text-white"
        style={{ backgroundColor: profile.accentColor }}
      >
        {profile.initials}
      </span>
      {profile.displayName}
    </button>
  );
}

function EntryList({
  entries,
  onEdit,
  onDelete,
}: {
  entries: StudyEntry[];
  onEdit: (entry: StudyEntry) => void;
  onDelete: (entry: StudyEntry) => void;
}) {
  if (!entries.length) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-semibold text-stone-600">
        No study logged yet. Fifteen minutes is a good beginning.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3"
        >
          <div>
            <p className="font-extrabold text-stone-900">{formatMinutes(entry.durationMinutes)}</p>
            <p className="text-xs font-semibold text-stone-500">
              {new Date(entry.createdAt).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="grid size-11 place-items-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
              aria-label={`Edit ${formatMinutes(entry.durationMinutes)} entry`}
            >
              <Edit3 size={17} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="grid size-11 place-items-center rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-50"
              aria-label={`Delete ${formatMinutes(entry.durationMinutes)} entry`}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TimeDialog({
  title,
  initialMinutes,
  onClose,
  onSave,
}: {
  title: string;
  initialMinutes: number;
  onClose: () => void;
  onSave: (minutes: number) => void;
}) {
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)));
  const [minutes, setMinutes] = useState(String(initialMinutes % 60));
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const total = Math.max(0, Number(hours || 0) * 60 + Number(minutes || 0));
    if (!Number.isFinite(total) || total <= 0 || total > 720) return;
    onSave(Math.round(total));
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-5">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-stone-950">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg border border-stone-200"
            aria-label="Close custom time"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="grid gap-2 text-sm font-bold text-stone-700">
            Hours
            <input
              min="0"
              max="12"
              type="number"
              inputMode="numeric"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="min-h-12 rounded-lg border border-stone-300 px-3 text-lg font-bold"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-stone-700">
            Minutes
            <input
              min="0"
              max="59"
              type="number"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="min-h-12 rounded-lg border border-stone-300 px-3 text-lg font-bold"
            />
          </label>
        </div>
        <p className="mt-3 text-sm font-semibold text-stone-500">
          Enter completed study time. Maximum 12 hours per entry.
        </p>
        <button className="mt-5 min-h-12 w-full rounded-xl bg-stone-950 px-5 font-extrabold text-white">
          Save time
        </button>
      </form>
    </div>
  );
}

function Celebration({
  data,
  onDismiss,
  onAdjust,
}: {
  data: TrackerData;
  onDismiss: () => void;
  onAdjust: (profileId: string, delta: number) => void;
}) {
  const lastWeek = addDays(getWeekStart(new Date()), -7);
  const householdTotal = data.profiles.reduce(
    (total, profile) => total + weeklyStats(data.entries, profile, lastWeek).totalMinutes,
    0,
  );
  const combinedShowUps = data.profiles.reduce(
    (total, profile) => total + weeklyStats(data.entries, profile, lastWeek).showUpDays,
    0,
  );
  const anyGoal = data.profiles.some((profile) => {
    const stats = weeklyStats(data.entries, profile, lastWeek);
    return (
      stats.totalMinutes >= profile.weeklyHoursTarget * 60 ||
      stats.showUpDays >= profile.weeklyShowUpTarget
    );
  });

  if (householdTotal === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-amber-700">
            Week complete
          </p>
          <h2 className="mt-1 text-xl font-black text-stone-950">
            {anyGoal ? 'Team win' : 'You started'}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-stone-700">
            Together, you studied for {formatMinutes(householdTotal)} and showed up on{' '}
            {combinedShowUps} combined days. You kept returning, and that is the habit.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-amber-200 bg-white"
          aria-label="Dismiss weekly celebration"
        >
          <X size={17} />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.profiles.map((profile) => {
          const stats = weeklyStats(data.entries, profile, lastWeek);
          const metHours = stats.totalMinutes >= profile.weeklyHoursTarget * 60;
          const metDays = stats.showUpDays >= profile.weeklyShowUpTarget;
          return (
            <div key={profile.id} className="rounded-xl bg-white p-3">
              <p className="font-black text-stone-950">{profile.displayName}</p>
              <p className="mt-1 text-sm font-semibold text-stone-600">
                {metDays ? '✓' : ''} {stats.showUpDays} show-up days
              </p>
              <p className="text-sm font-semibold text-stone-600">
                {metHours ? '✓' : ''} {formatMinutes(stats.totalMinutes)} of{' '}
                {profile.weeklyHoursTarget}h
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onAdjust(profile.id, -1)}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-extrabold"
                >
                  Reduce target
                </button>
                <button
                  type="button"
                  onClick={() => onAdjust(profile.id, 1)}
                  className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-extrabold"
                >
                  Increase target
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyOverview({
  profiles,
  entries,
  onEditTargets,
  className = '',
}: {
  profiles: Profile[];
  entries: StudyEntry[];
  onEditTargets: () => void;
  className?: string;
}) {
  const weekDayIndex = getWeekDays(new Date()).findIndex(
    (day) => toDateId(day) === todayId,
  );
  const daysRemaining = Math.max(7 - weekDayIndex - 1, 0);

  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">This week together</h2>
          <p className="mt-1 text-sm font-semibold text-stone-600">
            Both partners, side by side. No rankings, just rhythm.
          </p>
        </div>
        <button
          type="button"
          onClick={onEditTargets}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 font-extrabold"
        >
          <Settings size={17} />
          Edit targets
        </button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {profiles.map((profile) => {
          const stats = weeklyStats(entries, profile, new Date());
          const streak = streakStats(entries, profile.id);
          return (
            <div key={profile.id} className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 place-items-center rounded-full text-sm font-black text-white"
                    style={{ backgroundColor: profile.accentColor }}
                  >
                    {profile.initials}
                  </span>
                  <h3 className="text-xl font-black">{profile.displayName}</h3>
                </div>
                <span className="font-black text-stone-500">
                  {formatMinutes(stats.totalMinutes)}
                </span>
              </div>
              <div className="mt-5 grid min-w-0 grid-cols-7 gap-1 sm:gap-2">
                {stats.dayRows.map((day) => (
                  <div
                    key={day.dateId}
                    className="min-w-0 rounded-2xl"
                  >
                    <ProgressCircle day={day} accent={profile.accentColor} compact />
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">
                      Show-up run
                    </p>
                    <p className="mt-1 text-xl font-black text-stone-950">
                      {streak.currentRun} day{streak.currentRun === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">
                      Best run
                    </p>
                    <p className="mt-1 text-xl font-black text-stone-950">
                      {streak.bestRun} day{streak.bestRun === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between gap-3 text-sm font-extrabold">
                    <span>Weekly study time</span>
                    <span>
                      {formatMinutes(stats.totalMinutes)} of {profile.weeklyHoursTarget}h
                    </span>
                  </div>
                  <ProgressBar
                    value={stats.totalMinutes}
                    max={profile.weeklyHoursTarget * 60}
                    accent={profile.accentColor}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between gap-3 text-sm font-extrabold">
                    <span>Show-up days</span>
                    <span>
                      {stats.showUpDays} of {profile.weeklyShowUpTarget}
                    </span>
                  </div>
                  <p
                    className="text-lg tracking-[0.18em]"
                    aria-label={`${stats.showUpDays} of ${profile.weeklyShowUpTarget} show-up days`}
                  >
                    {Array.from(
                      { length: profile.weeklyShowUpTarget },
                      (_, index) => (index < stats.showUpDays ? '●' : '○'),
                    ).join(' ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function TrackerPage() {
  const [data, setData] = useState<TrackerData>(() => loadData());
  const [activeProfileId, setActiveProfileId] = useState(() =>
    loadActiveProfileId(data.profiles),
  );
  const [view, setView] = useState<View>('today');
  const [customOpen, setCustomOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StudyEntry | null>(null);
  const [toast, setToast] = useState('');
  const [undoEntry, setUndoEntry] = useState<StudyEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayId);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerProfileId, setTimerProfileId] = useState(activeProfileId);
  const [syncStatus, setSyncStatus] = useState<'local' | 'loading' | 'synced' | 'error'>(
    hasSupabaseConfig ? 'loading' : 'local',
  );
  const [syncMessage, setSyncMessage] = useState(
    hasSupabaseConfig ? 'Connecting to shared tracker...' : 'Local browser only',
  );
  const [historyMonth, setHistoryMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const lastTapRef = useRef(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const cloudReadyRef = useRef(false);
  const applyingCloudRef = useRef(false);
  const lastCloudUpdatedAtRef = useRef<string | null>(null);

  async function refreshFromCloud(silent = false) {
    const result = await loadCloudData();
    if (result.error) {
      setSyncStatus('error');
      setSyncMessage(
        result.error.message.includes('tracker_state')
          ? 'Run supabase-tracker-sync-setup.sql, then refresh.'
          : result.error.message,
      );
      return;
    }

    if (!result.data) {
      const saved = await saveCloudData(data);
      if (saved.error) {
        setSyncStatus('error');
        setSyncMessage(saved.error.message);
        return;
      }
      lastCloudUpdatedAtRef.current = saved.updatedAt;
      cloudReadyRef.current = true;
      setSyncStatus('synced');
      setSyncMessage('Shared tracker connected');
      return;
    }

    if (result.updatedAt && result.updatedAt !== lastCloudUpdatedAtRef.current) {
      applyingCloudRef.current = true;
      setData(result.data);
      saveData(result.data);
      lastCloudUpdatedAtRef.current = result.updatedAt;
      window.setTimeout(() => {
        applyingCloudRef.current = false;
      }, 0);
      if (!silent && cloudReadyRef.current) {
        announce('Shared tracker refreshed.');
      }
    }

    cloudReadyRef.current = true;
    setSyncStatus('synced');
    setSyncMessage('Shared tracker connected');
  }

  const activeProfile = data.profiles.find((profile) => profile.id === activeProfileId) ?? data.profiles[0];
  const partner = data.profiles.find((profile) => profile.id !== activeProfile.id);
  const todayMinutes = minutesFor(data.entries, activeProfile.id, todayId);
  const todayLevel = levelFor(todayMinutes);
  const activeTodayEntries = data.entries
    .filter((entry) => entry.profileId === activeProfile.id && entry.studyDate === todayId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeWeek = weeklyStats(data.entries, activeProfile, new Date());
  const partnerWeek = partner ? weeklyStats(data.entries, partner, new Date()) : null;
  const activeStreak = streakStats(data.entries, activeProfile.id);
  const weekStartId = toDateId(getWeekStart(new Date()));
  const celebrationDismissed = data.dismissedCelebrations.includes(weekStartId);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    if (!hasSupabaseConfig) return;

    refreshFromCloud(true);
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig || !cloudReadyRef.current || applyingCloudRef.current) {
      return;
    }

    setSyncStatus('loading');
    setSyncMessage('Saving shared tracker...');
    const timeoutId = window.setTimeout(async () => {
      const result = await saveCloudData(data);
      if (result.error) {
        setSyncStatus('error');
        setSyncMessage(result.error.message);
        return;
      }
      lastCloudUpdatedAtRef.current = result.updatedAt;
      setSyncStatus('synced');
      setSyncMessage('Shared tracker saved');
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [data]);

  useEffect(() => {
    saveActiveProfileId(activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTimerSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds === 0 && !timerRunning) {
      setTimerProfileId(activeProfileId);
    }
  }, [activeProfileId, timerRunning, timerSeconds]);

  function announce(message: string) {
    setToast(message);
    if (liveRef.current) liveRef.current.textContent = message;
  }

  function updateData(updater: (current: TrackerData) => TrackerData) {
    setData((current) => updater(current));
  }

  function addMinutes(minutes: number) {
    const now = Date.now();
    if (now - lastTapRef.current < 650) return;
    lastTapRef.current = now;
    if (minutes <= 0 || minutes > 720) {
      announce('Enter a time between 1 minute and 12 hours.');
      return;
    }
    const entry = makeEntry(activeProfile.id, minutes, new Date());
    updateData((current) => ({ ...current, entries: [entry, ...current.entries] }));
    setUndoEntry(entry);
    announce(encouragementFor(minutes, todayMinutes + minutes));
  }

  function handleTimerToggle() {
    if (!timerRunning && timerSeconds === 0) {
      setTimerProfileId(activeProfile.id);
    }

    setTimerRunning((current) => !current);
  }

  function handleTimerReset() {
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerProfileId(activeProfile.id);
    announce('Timer reset.');
  }

  function handleTimerLog() {
    if (timerSeconds <= 0) {
      announce('Start the timer first, then log the completed time.');
      return;
    }

    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    const timerProfile =
      data.profiles.find((profile) => profile.id === timerProfileId) ?? activeProfile;
    const entry = makeEntry(timerProfile.id, minutes, new Date());

    updateData((current) => ({ ...current, entries: [entry, ...current.entries] }));
    setUndoEntry(entry);
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerProfileId(activeProfile.id);
    announce(
      `Logged ${formatMinutes(minutes)} for ${timerProfile.displayName}. A timed session counts too.`,
    );
  }

  function undoLast() {
    if (!undoEntry) return;
    updateData((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== undoEntry.id),
    }));
    setUndoEntry(null);
    announce('Entry removed. Accidents are easy to fix.');
  }

  function editEntry(entry: StudyEntry, minutes: number) {
    updateData((current) => ({
      ...current,
      entries: current.entries.map((item) =>
        item.id === entry.id
          ? { ...item, durationMinutes: minutes, updatedAt: new Date().toISOString() }
          : item,
      ),
    }));
    setEditingEntry(null);
    announce('Entry updated. Totals are refreshed.');
  }

  function deleteEntry(entry: StudyEntry) {
    updateData((current) => ({
      ...current,
      entries: current.entries.filter((item) => item.id !== entry.id),
    }));
    announce('Entry deleted. Your effort carries forward.');
  }

  function updateProfile(profileId: string, patch: Partial<Profile>) {
    updateData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === profileId ? { ...profile, ...patch } : profile,
      ),
    }));
  }

  function updateProfileNumber(
    profileId: string,
    field: 'weeklyHoursTarget' | 'weeklyShowUpTarget',
    rawValue: string,
    min: number,
    max: number,
  ) {
    if (rawValue === '') {
      updateProfile(profileId, { [field]: '' } as unknown as Partial<Profile>);
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    updateProfile(profileId, { [field]: Math.min(max, Math.max(min, value)) });
  }

  function resetData(withSample: boolean) {
    const next = createDefaultData(withSample);
    setData(next);
    setActiveProfileId(next.profiles[0].id);
    saveActiveProfileId(next.profiles[0].id);
    announce(withSample ? 'Sample data restored.' : 'Fresh household ready.');
  }

  const nav = [
    { id: 'today' as const, label: 'Today', icon: Home },
    { id: 'history' as const, label: 'History', icon: History },
  ];

  return (
    <main className="min-h-screen bg-[#f7f0e8] pb-24 text-stone-900 md:pb-0">
      <div ref={liveRef} className="sr-only" aria-live="polite" />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-4 md:grid-cols-[220px_1fr] md:px-6 md:py-6">
        <aside className="hidden rounded-3xl border border-white/70 bg-white/72 p-3 shadow-sm backdrop-blur md:block">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-stone-950 text-white">
              <Heart size={20} />
            </span>
            <div>
              <p className="font-black">Study Tracker</p>
              <p className="text-xs font-bold text-stone-500">Gentle consistency</p>
            </div>
          </div>
          <nav className="mt-4 grid gap-2" aria-label="Primary tracker navigation">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 font-extrabold transition ${
                  view === id ? 'bg-stone-950 text-white' : 'text-stone-600 hover:bg-white'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 font-extrabold text-stone-600 hover:bg-white"
          >
            <Settings size={18} />
            Settings
          </button>
        </aside>

        <section className="grid min-w-0 gap-5">
          <header className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-stone-500">
                {greeting()}, {activeProfile.displayName}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-normal sm:text-3xl">
                Small sessions preserve the habit.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.profiles.map((profile) => (
                <ProfilePill
                  key={profile.id}
                  profile={profile}
                  active={profile.id === activeProfile.id}
                  onClick={() => setActiveProfileId(profile.id)}
                />
              ))}
              <span
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-extrabold ${
                  syncStatus === 'synced'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : syncStatus === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : syncStatus === 'loading'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-stone-200 bg-white text-stone-500'
                }`}
                title={syncMessage}
              >
                {syncStatus === 'synced'
                  ? 'Synced'
                  : syncStatus === 'error'
                    ? 'Sync issue'
                    : syncStatus === 'loading'
                      ? 'Syncing'
                      : 'Local only'}
              </span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="grid size-11 place-items-center rounded-full border border-stone-200 bg-white md:hidden"
                aria-label="Open settings"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </header>

          {toast && (
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-extrabold text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
              <span>{toast}</span>
              {undoEntry && (
                <button
                  type="button"
                  onClick={undoLast}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-emerald-900 shadow-sm"
                >
                  <RotateCcw size={16} />
                  Undo
                </button>
              )}
            </div>
          )}

          {!celebrationDismissed && (
            <Celebration
              data={data}
              onDismiss={() =>
                updateData((current) => ({
                  ...current,
                  dismissedCelebrations: [...current.dismissedCelebrations, weekStartId],
                }))
              }
              onAdjust={(profileId, delta) => {
                const profile = data.profiles.find((item) => item.id === profileId);
                if (!profile) return;
                updateProfile(profileId, {
                  weeklyHoursTarget: Math.max(1, profile.weeklyHoursTarget + delta),
                });
              }}
            />
          )}

          {view === 'today' && (
            <div className="grid w-full justify-stretch gap-5">
              <section className="min-w-full overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
                <div
                  className="h-2"
                  style={{ backgroundColor: activeProfile.accentColor }}
                />
                <div className="grid gap-5 p-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(440px,1.05fr)] xl:items-stretch xl:p-6">
                  <div className="grid content-start gap-4 rounded-3xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-stone-500">
                          Today's total
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-stone-950">
                          {activeProfile.displayName}'s study time
                        </h2>
                      </div>
                      <span
                        className="grid size-12 shrink-0 place-items-center rounded-2xl"
                        style={{
                          backgroundColor: `${activeProfile.accentColor}18`,
                          color: activeProfile.accentColor,
                        }}
                      >
                        <Clock3 size={23} />
                      </span>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <p className="whitespace-nowrap text-5xl font-black leading-none text-stone-950 sm:text-6xl 2xl:text-7xl">
                          {formatMinutes(todayMinutes)}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 font-black text-stone-950">
                          <span>{todayLevel.icon}</span>
                          {todayLevel.label}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                          <span>Show-up goal</span>
                          <span>{Math.min(todayMinutes, 30)}m / 30m</span>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${showUpProgress(todayMinutes)}%`,
                              backgroundColor: activeProfile.accentColor,
                            }}
                          />
                        </div>
                        <p
                          className="mt-3 text-sm font-bold leading-6"
                          style={{ color: activeProfile.accentColor }}
                        >
                          {todaySupportText(todayMinutes)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">
                            Show-up run
                          </p>
                          <p className="mt-1 text-2xl font-black text-stone-950">
                            {activeStreak.currentRun} day
                            {activeStreak.currentRun === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">
                            Best run
                          </p>
                          <p className="mt-1 text-2xl font-black text-stone-950">
                            {activeStreak.bestRun} day
                            {activeStreak.bestRun === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 lg:p-5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-stone-500">
                            Add completed study time
                          </p>
                          <p className="mt-1 text-sm font-semibold text-stone-600">
                            Choose the amount you just studied.
                          </p>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-stone-400">
                          One tap
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => addMinutes(15)}
                          className="min-h-20 rounded-2xl text-xl font-black text-white shadow-sm transition hover:brightness-95 active:scale-[0.98] lg:min-h-24"
                          style={{ backgroundColor: activeProfile.accentColor }}
                        >
                          +15 min
                        </button>
                        <button
                          type="button"
                          onClick={() => addMinutes(30)}
                          className="min-h-20 rounded-2xl text-xl font-black text-white shadow-sm transition hover:brightness-95 active:scale-[0.98] lg:min-h-24"
                          style={{ backgroundColor: activeProfile.accentColor }}
                        >
                          +30 min
                        </button>
                        <button
                          type="button"
                          onClick={() => addMinutes(60)}
                          className="col-span-2 min-h-16 rounded-2xl text-xl font-black text-white shadow-sm transition hover:brightness-95 active:scale-[0.98] lg:col-span-1 lg:min-h-24"
                          style={{ backgroundColor: activeProfile.accentColor }}
                        >
                          +1 hour
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomOpen(true)}
                          className="col-span-2 min-h-14 rounded-2xl border border-stone-200 bg-white text-base font-black text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 lg:col-span-3"
                        >
                          Custom time
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-stone-200 bg-white p-4">
                      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-extrabold uppercase tracking-[0.12em] text-stone-500">
                              Focus timer
                            </p>
                            <span
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black"
                              style={{
                                backgroundColor: `${activeProfile.accentColor}12`,
                                color: activeProfile.accentColor,
                              }}
                            >
                              <Clock3 size={14} />
                              {data.profiles.find((profile) => profile.id === timerProfileId)
                                ?.displayName ?? activeProfile.displayName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-stone-600">
                            Time a session, then log it.
                          </p>
                        </div>
                        <p className="font-mono text-3xl font-black tracking-normal text-stone-950 sm:text-4xl">
                          {formatTimerSeconds(timerSeconds)}
                        </p>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={handleTimerToggle}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-stone-950 px-3 text-sm font-black text-white"
                        >
                          {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                          {timerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button
                          type="button"
                          onClick={handleTimerReset}
                          disabled={timerSeconds === 0 && !timerRunning}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-black text-stone-700 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Square size={15} />
                          Reset
                        </button>
                        <button
                          type="button"
                          onClick={handleTimerLog}
                          disabled={timerSeconds === 0}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-black text-stone-700 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Check size={16} />
                          Log
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <WeeklyOverview
                profiles={data.profiles}
                entries={data.entries}
                onEditTargets={() => setSettingsOpen(true)}
                className="w-full"
              />

              <section className="w-full rounded-3xl bg-white p-5 shadow-sm">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h2 className="text-xl font-black">Recent entries</h2>
                    <div className="mt-4">
                      <EntryList entries={activeTodayEntries} onEdit={setEditingEntry} onDelete={deleteEntry} />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Partner today</h2>
                    {partner ? (
                      <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-11 place-items-center rounded-full text-white"
                            style={{ backgroundColor: partner.accentColor }}
                          >
                            {partner.initials}
                          </span>
                          <div>
                            <p className="font-black">{partner.displayName}</p>
                            <p className="text-sm font-semibold text-stone-600">
                              {levelFor(minutesFor(data.entries, partner.id, todayId)).icon}{' '}
                              {formatMinutes(minutesFor(data.entries, partner.id, todayId))} -{' '}
                              {levelFor(minutesFor(data.entries, partner.id, todayId)).label}
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm font-semibold text-stone-600">
                          Weekly total: {formatMinutes(partnerWeek?.totalMinutes ?? 0)}. Household total:{' '}
                          {formatMinutes(activeWeek.totalMinutes + (partnerWeek?.totalMinutes ?? 0))}.
                        </p>
                        <button
                          type="button"
                          onClick={() => announce('Encouragement ready: Even a small session counts.')}
                          className="mt-4 min-h-11 rounded-xl border border-stone-200 bg-white px-4 font-extrabold"
                        >
                          Send gentle encouragement
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm font-semibold text-stone-600">
                        Your partner hasn't set up their profile yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {view === 'history' && (
            <div className="grid gap-5">
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                    }
                    className="grid size-11 place-items-center rounded-xl border border-stone-200"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h2 className="text-xl font-black">
                    {historyMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                    }
                    className="grid size-11 place-items-center rounded-xl border border-stone-200"
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-extrabold uppercase text-stone-500">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }, (_, index) => {
                    const first = getWeekStart(historyMonth);
                    const date = addDays(first, index);
                    const dateId = toDateId(date);
                    const inMonth = date.getMonth() === historyMonth.getMonth();
                    const total = minutesFor(data.entries, activeProfile.id, dateId);
                    const level = levelFor(total);
                    return (
                      <button
                        key={dateId}
                        type="button"
                        onClick={() => setSelectedDate(dateId)}
                        className={`min-h-16 rounded-2xl border p-1 text-center transition ${
                          selectedDate === dateId ? 'border-stone-950 bg-stone-50' : 'border-stone-200 bg-white'
                        } ${inMonth ? '' : 'opacity-40'}`}
                        aria-label={`${dateId}: ${level.label}, ${formatMinutes(total)}`}
                      >
                        <span className="block text-xs font-black">{date.getDate()}</span>
                        <span className="mt-1 block text-sm">{level.icon}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">History detail</h2>
                <p className="mt-1 text-sm font-semibold text-stone-600">
                  Your history will appear after your first study log.
                </p>
                <div className="mt-4">
                  <EntryList
                    entries={data.entries.filter(
                      (entry) => entry.profileId === activeProfile.id && entry.studyDate === selectedDate,
                    )}
                    onEdit={setEditingEntry}
                    onDelete={deleteEntry}
                  />
                </div>
              </section>
            </div>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden" aria-label="Primary tracker navigation">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`grid min-h-14 place-items-center rounded-2xl text-xs font-black ${
                view === id ? 'bg-stone-950 text-white' : 'text-stone-600'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {customOpen && (
        <TimeDialog
          title="Custom study time"
          initialMinutes={30}
          onClose={() => setCustomOpen(false)}
          onSave={(minutes) => {
            setCustomOpen(false);
            addMinutes(minutes);
          }}
        />
      )}

      {editingEntry && (
        <TimeDialog
          title="Edit study entry"
          initialMinutes={editingEntry.durationMinutes}
          onClose={() => setEditingEntry(null)}
          onSave={(minutes) => editEntry(editingEntry, minutes)}
        />
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-50 grid items-end bg-black/30 sm:place-items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-label="Tracker settings" className="max-h-[92svh] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Settings</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="grid size-11 place-items-center rounded-xl border border-stone-200"
                aria-label="Close settings"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {data.profiles.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-stone-200 p-4">
                  <label className="grid gap-2 text-sm font-bold text-stone-700">
                    Display name
                    <input
                      value={profile.displayName}
                      onChange={(event) =>
                        updateProfile(profile.id, {
                          displayName: event.target.value,
                          initials: event.target.value.trim().slice(0, 1).toUpperCase() || '?',
                        })
                      }
                      className="min-h-12 rounded-xl border border-stone-300 px-3 font-bold"
                    />
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="grid gap-2 text-sm font-bold text-stone-700">
                      Weekly hours
                      <input
                        min="1"
                        max="80"
                        type="number"
                        value={profile.weeklyHoursTarget}
                        onChange={(event) =>
                          updateProfileNumber(
                            profile.id,
                            'weeklyHoursTarget',
                            event.target.value,
                            1,
                            80,
                          )
                        }
                        onBlur={(event) => {
                          if (event.target.value === '') {
                            updateProfile(profile.id, { weeklyHoursTarget: 1 });
                          }
                        }}
                        className="min-h-12 rounded-xl border border-stone-300 px-3 font-bold"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-stone-700">
                      Show-up days
                      <input
                        min="1"
                        max="7"
                        type="number"
                        value={profile.weeklyShowUpTarget}
                        onChange={(event) =>
                          updateProfileNumber(
                            profile.id,
                            'weeklyShowUpTarget',
                            event.target.value,
                            1,
                            7,
                          )
                        }
                        onBlur={(event) => {
                          if (event.target.value === '') {
                            updateProfile(profile.id, { weeklyShowUpTarget: 1 });
                          }
                        }}
                        className="min-h-12 rounded-xl border border-stone-300 px-3 font-bold"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => resetData(false)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 font-extrabold"
              >
                <Trash2 size={17} />
                Reset empty
              </button>
              <button
                type="button"
                onClick={() => resetData(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 font-extrabold"
              >
                <Leaf size={17} />
                Restore sample data
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-950 px-4 font-extrabold text-white"
              >
                <Check size={17} />
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
