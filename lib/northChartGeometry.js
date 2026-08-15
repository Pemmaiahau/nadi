/**
 * North Indian (diamond) chart geometry on a 400x400 board.
 *
 * Construction: the square's two diagonals plus the diamond joining the four
 * edge midpoints cut the board into exactly 12 regions - four central kites
 * (houses 1, 4, 7, 10) and eight corner triangles. Houses are fixed in
 * position and run anticlockwise from the top-centre diamond.
 *
 * Kept as a plain module (not inline in the JSX) so the tiling can be verified
 * numerically by scripts/verify-chart-geometry.mjs.
 */

export const BOARD = 400;

export const HOUSE_POLYGONS = {
  1: [[100, 100], [200, 0], [300, 100], [200, 200]],
  2: [[0, 0], [200, 0], [100, 100]],
  3: [[0, 0], [100, 100], [0, 200]],
  4: [[0, 200], [100, 100], [200, 200], [100, 300]],
  5: [[0, 200], [100, 300], [0, 400]],
  6: [[0, 400], [100, 300], [200, 400]],
  7: [[200, 200], [300, 300], [200, 400], [100, 300]],
  8: [[200, 400], [300, 300], [400, 400]],
  9: [[400, 400], [300, 300], [400, 200]],
  10: [[200, 200], [300, 100], [400, 200], [300, 300]],
  11: [[400, 200], [300, 100], [400, 0]],
  12: [[400, 0], [300, 100], [200, 0]],
};

/** Where the sign number sits, and where the stack of planets starts. */
export const HOUSE_ANCHORS = {
  1: { sign: [200, 34], body: [200, 96] },
  2: { sign: [72, 22], body: [100, 52] },
  3: { sign: [22, 72], body: [52, 100] },
  4: { sign: [44, 200], body: [104, 200] },
  5: { sign: [22, 328], body: [52, 300] },
  6: { sign: [72, 378], body: [100, 352] },
  7: { sign: [200, 366], body: [200, 304] },
  8: { sign: [328, 378], body: [300, 352] },
  9: { sign: [378, 328], body: [348, 300] },
  10: { sign: [356, 200], body: [296, 200] },
  11: { sign: [378, 72], body: [348, 100] },
  12: { sign: [328, 22], body: [300, 52] },
};

/** SVG `points` attribute string for a house. */
export function polygonPoints(house) {
  return HOUSE_POLYGONS[house].map(([x, y]) => `${x},${y}`).join(' ');
}

/** Shoelace area of a simple polygon. */
export function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon([px, py], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
