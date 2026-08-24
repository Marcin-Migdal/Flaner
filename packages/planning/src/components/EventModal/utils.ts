const SLOT_COLORS = [
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#0ea5e9", // sky-500
  "#0d9488", // teal-600
  "#64748b", // slate-500
];

export const getRandomSlotColor = (
  newSlotStart: Date,
  newSlotEnd: Date,
  existingDates: Array<{ start: Date; end: Date; color: string }>,
): string => {
  const proximityMs = 7 * 24 * 60 * 60 * 1000;

  const closeSlots = existingDates.filter((slot) => {
    const slotStart = slot.start.getTime();
    return (
      Math.abs(slotStart - newSlotStart.getTime()) <= proximityMs ||
      Math.abs(slotStart - newSlotEnd.getTime()) <= proximityMs
    );
  });

  const usedColors = new Set(closeSlots.map((slot) => slot.color));
  const availableColors = SLOT_COLORS.filter((color) => !usedColors.has(color));
  const targetPalette = availableColors.length > 0 ? availableColors : SLOT_COLORS;

  const randomIndex = Math.floor(Math.random() * targetPalette.length);
  return targetPalette[randomIndex];
};
