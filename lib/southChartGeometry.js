/**
 * South Indian (square) chart layout.
 *
 * The inverse of the North Indian arrangement: signs are fixed in place and
 * the houses rotate with the Ascendant. Aries occupies the second cell of the
 * top row and the zodiac runs clockwise around the ring, leaving the middle
 * 2x2 free for the caption block.
 */

/** Grid position [row, col] for each sign index, 0 = Aries. */
export const SIGN_CELLS = [
  [0, 1], // Aries
  [0, 2], // Taurus
  [0, 3], // Gemini
  [1, 3], // Cancer
  [2, 3], // Leo
  [3, 3], // Virgo
  [3, 2], // Libra
  [3, 1], // Scorpio
  [3, 0], // Sagittarius
  [2, 0], // Capricorn
  [1, 0], // Aquarius
  [0, 0], // Pisces
];

/** Lookup from "row-col" to sign index; undefined for the centre block. */
export const CELL_TO_SIGN = new Map(SIGN_CELLS.map(([r, c], signIndex) => [`${r}-${c}`, signIndex]));
