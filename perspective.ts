export type Point = { x: number; y: number };

// Solves the 8x8 linear system for a homography via Gauss-Jordan elimination
// with partial pivoting. Unknowns are [a, b, c, d, e, f, g, h]; the matrix is
// always normalized so the bottom-right term is 1.
function solve8x8(A: number[][], b: number[]): number[] {
  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxAbs) {
        maxAbs = Math.abs(M[r][col]);
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-9) {
      continue; // degenerate quad (near-collinear corners) — leave row as-is
    }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / pivot;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  return M.map((row, i) => row[i] === 0 ? 0 : row[n] / row[i]);
}

/**
 * Computes the perspective (projective) transform mapping four source
 * points onto four destination points, in the same order (e.g. both
 * top-left, top-right, bottom-right, bottom-left).
 *
 * Returns a row-major 3x3 matrix [a, b, c, d, e, f, g, h, 1] such that for
 * a source point (x, y):
 *   w  = g*x + h*y + 1
 *   x' = (a*x + b*y + c) / w
 *   y' = (d*x + e*y + f) / w
 *
 * This is the standard 4-point DLT used for corner-pin / camera-lucida
 * style warps (the same system OpenCV's getPerspectiveTransform solves).
 */
export function computeHomography(
  src: readonly [Point, Point, Point, Point],
  dst: readonly [Point, Point, Point, Point]
): number[] {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];

    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }

  const [a, bb, c, d, e, f, g, h] = solve8x8(A, b);
  return [a, bb, c, d, e, f, g, h, 1];
}
