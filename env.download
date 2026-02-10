
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
 * Bedela xarafka una bedela lambar (e.g., A -> 1, B -> 2)
 */
export const letterToNumber = (letter: string): number => {
  if (!letter || typeof letter !== 'string') return 1;
  const cleanLetter = letter.trim().toUpperCase();
  if (/^\d+$/.test(cleanLetter)) return parseInt(cleanLetter); // Haddii uu lambar yahay horay ka qaado

  let num = 0;
  for (let i = 0; i < cleanLetter.length; i++) {
    num = num * 26 + (cleanLetter.charCodeAt(i) - 64);
  }
  return num > 0 ? num : 1;
};

/**
 * Isku dara iskafalada iyo godadka (e.g., A-01)
 */
export const formatPlacement = (shelf: number, section: number): string => {
  const shelfLetter = numberToLetter(shelf);
  const sectionStr = section < 10 ? `0${section}` : section.toString();
  return `${shelfLetter}-${sectionStr}`;
};
