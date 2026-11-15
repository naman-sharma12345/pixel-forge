import { encodePNG, scaleNearest } from './png.js';

export const createRng = (seedStr = 'pixel') => {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0;
  }
  let a = h >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const PALETTES = [
  // [outline, base, highlight, accent] in RGBA
  [[24, 20, 36, 255], [115, 62, 57, 255], [189, 117, 85, 255], [238, 195, 154, 255]], // 0 Retro Earth
  [[15, 20, 30, 255], [38, 73, 119, 255], [77, 149, 196, 255], [217, 242, 254, 255]], // 1 Cyber Ice
  [[20, 12, 28, 255], [94, 38, 112, 255], [163, 73, 164, 255], [242, 178, 255, 255]], // 2 Neon Purple
  [[10, 25, 20, 255], [32, 94, 60, 255], [82, 166, 92, 255], [180, 240, 140, 255]],  // 3 Forest Emerald
  [[30, 12, 14, 255], [130, 34, 42, 255], [209, 78, 64, 255], [255, 190, 110, 255]],  // 4 Crimson Dungeon
  [[25, 22, 15, 255], [145, 110, 50, 255], [210, 175, 80, 255], [255, 240, 150, 255]], // 5 Desert Gold
  [[12, 22, 35, 255], [30, 60, 95, 255], [65, 125, 170, 255], [130, 215, 240, 255]], // 6 Deep Abyss
  [[28, 15, 25, 255], [120, 45, 90, 255], [195, 85, 130, 255], [255, 180, 200, 255]], // 7 Vapor Sunset
  [[20, 20, 20, 255], [70, 75, 80, 255], [135, 140, 145, 255], [220, 225, 230, 255]], // 8 Steel Grey
  [[25, 18, 10, 255], [110, 70, 30, 255], [175, 120, 60, 255], [240, 190, 120, 255]], // 9 Autumn Rust
  [[10, 25, 30, 255], [25, 95, 110, 255], [60, 170, 180, 255], [160, 245, 230, 255]], // 10 Aqua Mint
  [[24, 15, 32, 255], [85, 45, 120, 255], [150, 85, 185, 255], [255, 160, 210, 255]], // 11 Magic Violet
];

const setPixel = (buf, w, x, y, rgba) => {
  if (x < 0 || x >= w || y < 0 || y >= buf.length / (w * 4)) return;
  const idx = (y * w + x) * 4;
  buf[idx] = rgba[0];
  buf[idx + 1] = rgba[1];
  buf[idx + 2] = rgba[2];
  buf[idx + 3] = rgba[3];
};

export const spriteCharacter = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const w = 16;
  const h = 16;
  const grid = Buffer.alloc(w * h);

  // Generate left half
  for (let y = 2; y < 14; y++) {
    for (let x = 2; x < 8; x++) {
      const prob = (7 - x) / 8 + 0.2;
      if (rng() < prob) {
        const c = rng() < 0.3 ? 3 : rng() < 0.6 ? 2 : 1;
        grid[y * w + x] = c;
        grid[y * w + (15 - x)] = c; // Mirror
      }
    }
  }

  // Draw 512x512 canvas with dark checkered background
  const pixels = Buffer.alloc(w * h * 4);
  const bg1 = [18, 16, 24, 255];
  const bg2 = [26, 23, 34, 255];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isCheck = (x + y) % 2 === 0;
      setPixel(pixels, w, x, y, isCheck ? bg1 : bg2);
    }
  }

  // Draw creature with dark outline
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const val = grid[y * w + x];
      if (val > 0) {
        // Outline neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && grid[ny * w + nx] === 0) {
              setPixel(pixels, w, nx, ny, pal[0]);
            }
          }
        }
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const val = grid[y * w + x];
      if (val > 0) {
        setPixel(pixels, w, x, y, pal[val]);
      }
    }
  }

  const scaled = scaleNearest(pixels, w, h, 32);
  return encodePNG(512, 512, scaled);
};

export const spriteSheet = (seed, frames = 6) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const frameW = 16;
  const frameH = 16;
  const totalW = frameW * frames;
  const totalH = frameH;

  // Base creature shape
  const baseGrid = Buffer.alloc(frameW * frameH);
  for (let y = 2; y < 14; y++) {
    for (let x = 3; x < 8; x++) {
      if (rng() < 0.65) {
        const c = rng() < 0.3 ? 3 : rng() < 0.6 ? 2 : 1;
        baseGrid[y * frameW + x] = c;
        baseGrid[y * frameW + (15 - x)] = c;
      }
    }
  }

  const sheetPixels = Buffer.alloc(totalW * totalH * 4); // Transparent by default

  for (let f = 0; f < frames; f++) {
    const yOffset = (f === 1 || f === 3) ? -1 : (f === 4 ? 1 : 0);
    const startX = f * frameW;

    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const val = baseGrid[y * frameW + x];
        if (val > 0) {
          const drawY = Math.max(0, Math.min(frameH - 1, y + yOffset));
          // Outline
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              setPixel(sheetPixels, totalW, startX + x + dx, drawY + dy, pal[0]);
            }
          }
        }
      }
    }

    for (let y = 0; y < frameH; y++) {
      for (let x = 0; x < frameW; x++) {
        const val = baseGrid[y * frameW + x];
        if (val > 0) {
          const drawY = Math.max(0, Math.min(frameH - 1, y + yOffset));
          setPixel(sheetPixels, totalW, startX + x, drawY, pal[val]);
        }
      }
    }
  }

  const scaled = scaleNearest(sheetPixels, totalW, totalH, 8);
  return encodePNG(totalW * 8, totalH * 8, scaled);
};

export const tileset = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const tilesPerRow = 8;
  const tileSize = 16;
  const sheetDim = tilesPerRow * tileSize; // 128x128
  const pixels = Buffer.alloc(sheetDim * sheetDim * 4);

  for (let ty = 0; ty < tilesPerRow; ty++) {
    for (let tx = 0; tx < tilesPerRow; tx++) {
      const tileKind = (ty * tilesPerRow + tx) % 4; // 0 grass, 1 dirt, 2 stone, 3 water
      for (let py = 0; py < tileSize; py++) {
        for (let px = 0; px < tileSize; px++) {
          const x = tx * tileSize + px;
          const y = ty * tileSize + py;
          let colorIdx = 1;

          if (tileKind === 0) { // grass variant
            colorIdx = py < 4 ? 3 : (rng() < 0.2 ? 2 : 1);
          } else if (tileKind === 1) { // dirt variant
            colorIdx = (px + py) % 3 === 0 ? 0 : (rng() < 0.3 ? 2 : 1);
          } else if (tileKind === 2) { // stone variant
            colorIdx = (px === 0 || py === 0 || px === 15 || py === 15) ? 0 : (rng() < 0.2 ? 3 : 2);
          } else { // water
            colorIdx = ((px + py + Math.floor(rng() * 3)) % 4 === 0) ? 3 : 2;
          }

          setPixel(pixels, sheetDim, x, y, pal[colorIdx]);
        }
      }
    }
  }

  const scaled = scaleNearest(pixels, sheetDim, sheetDim, 4);
  return encodePNG(512, 512, scaled);
};

export const background = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const w = 320;
  const h = 180;
  const pixels = Buffer.alloc(w * h * 4);

  // Gradient sky
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const r = Math.round(pal[0][0] * (1 - t) + pal[1][0] * t);
    const g = Math.round(pal[0][1] * (1 - t) + pal[1][1] * t);
    const b = Math.round(pal[0][2] * (1 - t) + pal[1][2] * t);
    for (let x = 0; x < w; x++) {
      setPixel(pixels, w, x, y, [r, g, b, 255]);
    }
  }

  // Stars
  for (let i = 0; i < 40; i++) {
    const sx = Math.floor(rng() * w);
    const sy = Math.floor(rng() * (h * 0.5));
    setPixel(pixels, w, sx, sy, pal[3]);
  }

  // 3 mountain silhouettes
  for (let layer = 0; layer < 3; layer++) {
    const layerColor = pal[layer + 1];
    let elevation = 60 + layer * 30;
    for (let x = 0; x < w; x++) {
      const wave = Math.sin((x + layer * 50) * 0.03) * 15 + Math.cos(x * 0.08) * 8;
      const maxY = Math.round(elevation + wave);
      for (let y = maxY; y < h; y++) {
        setPixel(pixels, w, x, y, layerColor);
      }
    }
  }

  const scaled = scaleNearest(pixels, w, h, 4);
  return encodePNG(w * 4, h * 4, scaled);
};

export const uiKit = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const w = 128;
  const h = 96;
  const pixels = Buffer.alloc(w * h * 4);

  // Fill dark background
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      setPixel(pixels, w, x, y, [16, 14, 22, 255]);
    }
  }

  // Panel
  for (let py = 6; py < 44; py++) {
    for (let px = 6; px < 60; px++) {
      const border = px === 6 || px === 59 || py === 6 || py === 43;
      setPixel(pixels, w, px, py, border ? pal[0] : pal[1]);
    }
  }

  // Buttons
  for (let b = 0; b < 3; b++) {
    const by = 50 + b * 14;
    for (let py = by; py < by + 10; py++) {
      for (let px = 6; px < 50; px++) {
        const border = px === 6 || px === 49 || py === by || py === by + 9;
        setPixel(pixels, w, px, py, border ? pal[0] : (b === 0 ? pal[3] : pal[2]));
      }
    }
  }

  // Health / Mana bars
  for (let bar = 0; bar < 2; bar++) {
    const by = 10 + bar * 16;
    for (let py = by; py < by + 8; py++) {
      for (let px = 68; px < 122; px++) {
        const isBorder = px === 68 || px === 121 || py === by || py === by + 7;
        const fill = px < 100;
        const c = isBorder ? pal[0] : (fill ? pal[bar === 0 ? 3 : 2] : pal[1]);
        setPixel(pixels, w, px, py, c);
      }
    }
  }

  const scaled = scaleNearest(pixels, w, h, 4);
  return encodePNG(512, 384, scaled);
};

export const vfx = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const frameDim = 32;
  const frames = 8;
  const totalW = frameDim * frames;
  const totalH = frameDim;
  const pixels = Buffer.alloc(totalW * totalH * 4);

  for (let f = 0; f < frames; f++) {
    const cx = f * frameDim + frameDim / 2;
    const cy = frameDim / 2;
    const radius = 2 + (f / (frames - 1)) * 12;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + rng() * 0.2;
      const r = radius * (0.6 + rng() * 0.4);
      const px = Math.round(cx + Math.cos(angle) * r);
      const py = Math.round(cy + Math.sin(angle) * r);
      const c = f < 3 ? pal[3] : f < 6 ? pal[2] : pal[1];
      setPixel(pixels, totalW, px, py, c);
      setPixel(pixels, totalW, px + 1, py, c);
    }
  }

  const scaled = scaleNearest(pixels, totalW, totalH, 4);
  return encodePNG(totalW * 4, totalH * 4, scaled);
};

export const bitmapFont = (seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const cols = 16;
  const rows = 6;
  const glyphSize = 8;
  const w = cols * glyphSize;
  const h = rows * glyphSize;
  const pixels = Buffer.alloc(w * h * 4);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const startX = gx * glyphSize;
      const startY = gy * glyphSize;
      for (let y = 1; y < 7; y++) {
        for (let x = 1; x < 7; x++) {
          if (rng() < 0.45) {
            setPixel(pixels, w, startX + x, startY + y, pal[3]);
          }
        }
      }
    }
  }

  const scaled = scaleNearest(pixels, w, h, 4);
  return encodePNG(w * 4, h * 4, scaled);
};

export const coverFor = (kind, seed) => {
  const rng = createRng(seed);
  const pal = PALETTES[Math.floor(rng() * PALETTES.length)];
  const dim = 128;
  const pixels = Buffer.alloc(dim * dim * 4);

  // Background gradient
  for (let y = 0; y < dim; y++) {
    const t = y / dim;
    const r = Math.round(pal[0][0] * (1 - t) + pal[1][0] * t);
    const g = Math.round(pal[0][1] * (1 - t) + pal[1][1] * t);
    const b = Math.round(pal[0][2] * (1 - t) + pal[1][2] * t);
    for (let x = 0; x < dim; x++) {
      setPixel(pixels, dim, x, y, [r, g, b, 255]);
    }
  }

  if (kind === '3d') {
    // Isometric low-poly cube in center
    const cx = 64;
    const cy = 64;
    const size = 28;

    // Top face
    for (let dy = -size; dy <= 0; dy++) {
      const span = Math.round((dy + size) * 0.8);
      for (let dx = -span; dx <= span; dx++) {
        setPixel(pixels, dim, cx + dx, cy + dy, pal[3]);
      }
    }
    // Left face
    for (let dy = 0; dy <= size; dy++) {
      for (let dx = -size; dx <= 0; dx++) {
        if (dy - dx * 0.5 < size * 1.2) {
          setPixel(pixels, dim, cx + dx, cy + dy, pal[2]);
        }
      }
    }
    // Right face
    for (let dy = 0; dy <= size; dy++) {
      for (let dx = 0; dx <= size; dx++) {
        if (dy + dx * 0.5 < size * 1.2) {
          setPixel(pixels, dim, cx + dx, cy + dy, pal[1]);
        }
      }
    }
  } else {
    // Stylized emblem in center
    const cx = 64;
    const cy = 64;
    const r = 32;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dist = Math.hypot(x - cx, y - cy);
        if (dist <= r) {
          const c = dist > r - 4 ? pal[0] : dist < 16 ? pal[3] : pal[2];
          setPixel(pixels, dim, x, y, c);
        }
      }
    }
  }

  const scaled = scaleNearest(pixels, dim, dim, 4);
  return encodePNG(512, 512, scaled);
};

export default {
  spriteCharacter,
  spriteSheet,
  tileset,
  background,
  uiKit,
  vfx,
  bitmapFont,
  coverFor,
};
