import type { EpgProgram } from "../domain/types";

const timestampOf = (value: string | Date): number => {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

export const calculateProgramProgress = (
  startAt: string | Date,
  endAt: string | Date,
  now: string | Date,
): number => {
  const start = timestampOf(startAt);
  const end = timestampOf(endAt);
  const current = timestampOf(now);
  if (![start, end, current].every(Number.isFinite) || end <= start) return 0;
  if (current <= start) return 0;
  if (current >= end) return 100;
  return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
};

export const isValidProgram = (program: EpgProgram): boolean => {
  const start = Date.parse(program.startAt);
  const end = Date.parse(program.endAt);
  return (
    program.title.trim().length > 0 && Number.isFinite(start) && Number.isFinite(end) && end > start
  );
};

export const selectCurrentAndNextPrograms = (
  programs: readonly EpgProgram[],
  now: string | Date,
): { currentProgram: EpgProgram | null; nextProgram: EpgProgram | null } => {
  const currentTime = timestampOf(now);
  if (!Number.isFinite(currentTime)) {
    return { currentProgram: null, nextProgram: null };
  }
  const validPrograms = programs
    .filter(isValidProgram)
    .slice()
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
  const currentIndex = validPrograms.findIndex(
    (program) =>
      Date.parse(program.startAt) <= currentTime && currentTime < Date.parse(program.endAt),
  );
  if (currentIndex >= 0) {
    return {
      currentProgram: validPrograms[currentIndex] ?? null,
      nextProgram:
        validPrograms.slice(currentIndex + 1).find((program) => {
          const current = validPrograms[currentIndex];
          return current ? Date.parse(program.startAt) >= Date.parse(current.endAt) : false;
        }) ?? null,
    };
  }
  return {
    currentProgram: null,
    nextProgram: validPrograms.find((program) => Date.parse(program.startAt) > currentTime) ?? null,
  };
};
