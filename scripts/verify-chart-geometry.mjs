/**
 * Verifies that the 12 North Indian house cells tile the board exactly - no
 * gaps, no overlaps - and that every text anchor sits inside the house it
 * labels. Hand-placed SVG coordinates are easy to get subtly wrong, and a
 * label drifting into the neighbouring house is a silent, plausible-looking
 * bug in a chart nobody would catch by reading the code.
 */

import {
  BOARD,
  HOUSE_POLYGONS,
  HOUSE_ANCHORS,
  polygonArea,
  pointInPolygon,
} from '../lib/northChartGeometry.js';
import { SIGN_CELLS } from '../lib/southChartGeometry.js';

let failures = 0;
const check = (label, ok, extra = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
};

console.log('\n=== North Indian chart geometry ===');

const houses = Object.keys(HOUSE_POLYGONS).map(Number).sort((a, b) => a - b);
check('twelve houses defined', houses.length === 12, `got ${houses.length}`);
check('houses numbered 1..12', houses.every((h, i) => h === i + 1));

// 1. Areas must sum to the full board.
const totalArea = houses.reduce((sum, h) => sum + polygonArea(HOUSE_POLYGONS[h]), 0);
check('cell areas sum to the whole board', Math.abs(totalArea - BOARD * BOARD) < 1e-9,
  `${totalArea} vs ${BOARD * BOARD}`);

// The four central kites are equal, and so are the eight corner triangles.
const kites = [1, 4, 7, 10].map((h) => polygonArea(HOUSE_POLYGONS[h]));
const triangles = [2, 3, 5, 6, 8, 9, 11, 12].map((h) => polygonArea(HOUSE_POLYGONS[h]));
check('four central kites are equal in area', new Set(kites).size === 1, `${kites[0]}`);
check('eight corner triangles are equal in area', new Set(triangles).size === 1, `${triangles[0]}`);
check('kite area is twice a triangle', Math.abs(kites[0] - 2 * triangles[0]) < 1e-9);

// 2. Dense sampling: every interior point belongs to exactly one house.
let gaps = 0;
let overlaps = 0;
const STEP = 3;
for (let x = 1; x < BOARD; x += STEP) {
  for (let y = 1; y < BOARD; y += STEP) {
    let hits = 0;
    for (const h of houses) if (pointInPolygon([x, y], HOUSE_POLYGONS[h])) hits += 1;
    if (hits === 0) gaps += 1;
    else if (hits > 1) overlaps += 1;
  }
}
// Points landing exactly on a shared edge are ambiguous for ray casting; with
// a step of 3 on a 400 board those are the only expected misses.
const sampled = Math.ceil((BOARD - 1) / STEP) ** 2;
check('no overlapping cells', overlaps === 0, `${overlaps} overlapping samples`);
check('no gaps beyond shared edges', gaps / sampled < 0.02, `${gaps}/${sampled} unassigned (edge samples)`);

// 3. Every anchor must sit inside the house it labels - the check that matters.
for (const h of houses) {
  const { sign, body } = HOUSE_ANCHORS[h];
  check(`house ${String(h).padStart(2)} sign number inside its cell`, pointInPolygon(sign, HOUSE_POLYGONS[h]),
    `at ${sign}`);
  check(`house ${String(h).padStart(2)} planet anchor inside its cell`, pointInPolygon(body, HOUSE_POLYGONS[h]),
    `at ${body}`);
}

// 4. Anchors must not stray into a different house either.
for (const h of houses) {
  const { body } = HOUSE_ANCHORS[h];
  const owners = houses.filter((o) => pointInPolygon(body, HOUSE_POLYGONS[o]));
  check(`house ${String(h).padStart(2)} anchor unambiguous`, owners.length === 1 && owners[0] === h,
    `claimed by house(s) ${owners.join(', ')}`);
}

console.log('\n=== South Indian chart layout ===');

check('twelve sign cells defined', SIGN_CELLS.length === 12);
const seen = new Set(SIGN_CELLS.map(([r, c]) => `${r}-${c}`));
check('no two signs share a cell', seen.size === 12);
check('all cells inside the 4x4 grid', SIGN_CELLS.every(([r, c]) => r >= 0 && r < 4 && c >= 0 && c < 4));

// The middle 2x2 must be free for the caption block.
const centre = [[1, 1], [1, 2], [2, 1], [2, 2]];
check('centre 2x2 is not used by any sign', centre.every(([r, c]) => !seen.has(`${r}-${c}`)));

// Signs must run clockwise from Aries around the ring.
const ring = [[0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0]];
check('signs run clockwise from Aries at top-row second cell',
  SIGN_CELLS.every(([r, c], i) => r === ring[i][0] && c === ring[i][1]));

// Auto-placement order: the DOM order of rendered cells must line up with the
// grid, otherwise the 2x2 centre pushes later cells out of position.
const order = [];
for (let i = 0; i < 16; i += 1) {
  const row = Math.floor(i / 4);
  const col = i % 4;
  const signIndex = SIGN_CELLS.findIndex(([r, c]) => r === row && c === col);
  if (signIndex >= 0) order.push({ i, row, col, signIndex });
}
check('all twelve signs are reachable by grid scan', order.length === 12);

console.log(`\n=== ${failures === 0 ? 'GEOMETRY OK' : `${failures} GEOMETRY CHECK(S) FAILED`} ===\n`);
process.exit(failures === 0 ? 0 : 1);
