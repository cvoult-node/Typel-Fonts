// ─────────────────────────────────────────────
//  CANVAS ALGORITHMS — src/canvas.js
// ─────────────────────────────────────────────

/** Flood fill 4-conectado */
export function floodFill(grid, size, startIdx, fillVal) {
  const target = grid[startIdx];
  if (target === fillVal) return grid;
  const next  = [...grid];
  const stack = [startIdx];
  while (stack.length) {
    const i = stack.pop();
    if (i < 0 || i >= size * size || next[i] !== target) continue;
    next[i] = fillVal;
    const r = Math.floor(i / size), c = i % size;
    if (c > 0)        stack.push(i - 1);
    if (c < size - 1) stack.push(i + 1);
    if (r > 0)        stack.push(i - size);
    if (r < size - 1) stack.push(i + size);
  }
  return next;
}

/** Desplazar píxeles con wrap-around */
export function shiftGrid(grid, size, dir) {
  const next = Array(size * size).fill(false);
  grid.forEach((v, i) => {
    if (!v) return;
    let r = Math.floor(i / size), c = i % size;
    if (dir === 'up')    r = (r - 1 + size) % size;
    if (dir === 'down')  r = (r + 1) % size;
    if (dir === 'left')  c = (c - 1 + size) % size;
    if (dir === 'right') c = (c + 1) % size;
    next[r * size + c] = true;
  });
  return next;
}

/** Exportar font data → opentype.Font y descargar */
export function buildAndDownload(fontData, gridSize, filename, format) {
  // opentype.js importado globalmente desde App.js
  const ot = window.__opentype__;
  if (!ot) { console.error('opentype not found'); return; }

  const glyphs = [
    new ot.Glyph({ name: '.notdef', unicode: 0, advanceWidth: 650, path: new ot.Path() })
  ];

  Object.keys(fontData).forEach(char => {
    const path = new ot.Path();
    const s    = 100;
    (fontData[char] || []).forEach((on, i) => {
      if (!on) return;
      const x = (i % gridSize) * s;
      const y = (gridSize - 1 - Math.floor(i / gridSize)) * s;
      path.moveTo(x, y); path.lineTo(x+s, y);
      path.lineTo(x+s, y+s); path.lineTo(x, y+s);
      path.close();
    });
    glyphs.push(new ot.Glyph({
      name: char === ' ' ? 'space' : char,
      unicode: char.charCodeAt(0),
      advanceWidth: gridSize * 110,
      path
    }));
  });

  const font = new ot.Font({
    familyName: filename, styleName: 'Regular',
    unitsPerEm: 1000, ascender: 800, descender: -200, glyphs
  });

  // opentype.js siempre genera OTF binario; cambiamos solo la extensión
  font.download(`${filename}.${format}`);
}
