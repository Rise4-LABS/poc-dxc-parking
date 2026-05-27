// ─── Créneaux de référence centralisés ────────────────────────────────────────
// Toute logique horaire passe par ce fichier — ne pas dupliquer ces constantes.

export const TIMESLOTS = {
  FULL_DAY:  { start: '07:00', end: '20:00', label: 'Journée',      sublabel: '07h – 20h' },
  MORNING:   { start: '07:00', end: '12:00', label: 'Matin',         sublabel: '07h – 12h' },
  AFTERNOON: { start: '12:00', end: '20:00', label: 'Après-midi',    sublabel: '12h – 20h' },
} as const;

export type DurationOption = 'FULL_DAY' | 'MORNING' | 'AFTERNOON' | 'CUSTOM' | 'INDEFINITE';

export const DURATION_OPTIONS: { key: DurationOption; label: string; sublabel: string }[] = [
  { key: 'FULL_DAY',   label: 'Journée',    sublabel: '07h – 20h'              },
  { key: 'MORNING',    label: 'Matin',       sublabel: '07h – 12h'             },
  { key: 'AFTERNOON',  label: 'Après-midi',  sublabel: '12h – 20h'             },
  { key: 'CUSTOM',     label: 'Plage libre', sublabel: 'Dates & heures libres'  },
  { key: 'INDEFINITE', label: 'Indéfini',    sublabel: 'Jusqu\'à nouvel ordre'  },
];

export function getTimesForDuration(
  d: DurationOption,
  customStart = '07:00',
  customEnd   = '20:00',
): { startTime: string; endTime: string | null } {
  if (d === 'INDEFINITE') return { startTime: '07:00', endTime: null };
  if (d === 'CUSTOM')     return { startTime: customStart, endTime: customEnd };
  return { startTime: TIMESLOTS[d].start, endTime: TIMESLOTS[d].end };
}

export function durationFromTimes(
  startTime: string,
  endTime:   string | null | undefined,
  isIndefinite?: boolean,
): DurationOption {
  if (isIndefinite) return 'INDEFINITE';
  for (const [key, val] of Object.entries(TIMESLOTS) as [keyof typeof TIMESLOTS, { start: string; end: string }][]) {
    if (startTime === val.start && endTime === val.end) return key;
  }
  return 'CUSTOM';
}
