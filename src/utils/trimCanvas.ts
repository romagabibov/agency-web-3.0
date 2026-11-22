export function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const l = pixels.data.length;
  const bound = {
    top: null as number | null,
    left: null as number | null,
    right: null as number | null,
    bottom: null as number | null
  };

  let x, y;
  for (let i = 0; i < l; i += 4) {
    if (pixels.data[i + 3] !== 0) { // alpha is not 0
      x = (i / 4) % canvas.width;
      y = Math.floor((i / 4) / canvas.width);

      if (bound.top === null) bound.top = y;
      if (bound.left === null || x < bound.left) bound.left = x;
      if (bound.right === null || x > bound.right) bound.right = x;
      if (bound.bottom === null || y > bound.bottom) bound.bottom = y;
    }
  }

  if (bound.top === null || bound.left === null || bound.right === null || bound.bottom === null) {
    // Empty canvas
    return canvas;
  }

  const trimHeight = bound.bottom - bound.top + 1;
  const trimWidth = bound.right - bound.left + 1;

  const trimmed = document.createElement('canvas');
  trimmed.width = trimWidth;
  trimmed.height = trimHeight;

  const trimmedCtx = trimmed.getContext('2d');
  if (trimmedCtx) {
    trimmedCtx.putImageData(ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight), 0, 0);
  }

  return trimmed;
}
