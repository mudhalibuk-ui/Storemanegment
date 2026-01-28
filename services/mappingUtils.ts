
/**
 * Bedela lambarka una bedela xarfo (e.g., 1 -> A, 2 -> B, 27 -> AA)
 */
export const numberToLetter = (num: number): string => {
  let letter = '';
  while (num > 0) {
    let mod = (num - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    num = Math.floor((num - mod) / 26);
  }
  return letter || 'A';
};

/**
 * Isku dara iskafalada iyo godadka (e.g., A-01)
 */
export const formatPlacement = (shelf: number, section: number): string => {
  const shelfLetter = numberToLetter(shelf);
  const sectionStr = section < 10 ? `0${section}` : section.toString();
  return `${shelfLetter}-${sectionStr}`;
};
