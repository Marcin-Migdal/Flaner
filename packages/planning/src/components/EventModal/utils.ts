const SLOT_COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
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
