import { SLOT_COLOR_KEYS, type SlotColorKey } from "../../utils/slotColors";

export const getRandomSlotColor = (
  newSlotStart: Date,
  newSlotEnd: Date,
  existingDates: Array<{ start: Date; end: Date; color: SlotColorKey }>,
): SlotColorKey => {
  const proximityMs = 7 * 24 * 60 * 60 * 1000;

  const closeSlots = existingDates.filter((slot) => {
    const slotStart = slot.start.getTime();
    return (
      Math.abs(slotStart - newSlotStart.getTime()) <= proximityMs ||
      Math.abs(slotStart - newSlotEnd.getTime()) <= proximityMs
    );
  });

  const usedColors = new Set(closeSlots.map((slot) => slot.color));
  const availableColors = SLOT_COLOR_KEYS.filter((color) => !usedColors.has(color));
  const targetPalette = availableColors.length > 0 ? availableColors : SLOT_COLOR_KEYS;

  const randomIndex = Math.floor(Math.random() * targetPalette.length);
  return targetPalette[randomIndex];
};
