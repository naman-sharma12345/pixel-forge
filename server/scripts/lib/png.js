import zlib from 'zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

const crc32 = (buf) => {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
};

const makeChunk = (type, data) => {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcPayload), 0);

  return Buffer.concat([lenBuf, crcPayload, crcBuf]);
};

export const encodePNG = (width, height, rgbaBuffer) => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const scanlineLength = width * 4;
  const rawData = Buffer.alloc(height * (1 + scanlineLength));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + scanlineLength);
    rawData[rawOffset] = 0; // Filter None
    rgbaBuffer.copy(rawData, rawOffset + 1, y * scanlineLength, (y + 1) * scanlineLength);
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
};

export const scaleNearest = (pixels, w, h, factor) => {
  const newW = w * factor;
  const newH = h * factor;
  const out = Buffer.alloc(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    const srcY = Math.floor(y / factor);
    for (let x = 0; x < newW; x++) {
      const srcX = Math.floor(x / factor);
      const srcIdx = (srcY * w + srcX) * 4;
      const dstIdx = (y * newW + x) * 4;

      out[dstIdx] = pixels[srcIdx];
      out[dstIdx + 1] = pixels[srcIdx + 1];
      out[dstIdx + 2] = pixels[srcIdx + 2];
      out[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  return out;
};

export default {
  encodePNG,
  scaleNearest,
};
