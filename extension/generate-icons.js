/**
 * Generate valid PNG icons for Chrome Extension using pure Node.js built-in zlib
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table & function
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createPng(size, r, g, b, a = 255) {
  // 1. Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // 2. IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData.writeUInt8(8, 8);       // bit depth
  ihdrData.writeUInt8(6, 9);       // color type RGBA
  ihdrData.writeUInt8(0, 10);      // compression
  ihdrData.writeUInt8(0, 11);      // filter
  ihdrData.writeUInt8(0, 12);      // interlace

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);

  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrChunk = Buffer.concat([ihdrLen, ihdrType, ihdrData, ihdrCrc]);

  // 3. Image scanlines (with nice rounded shield / border effect)
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(rowSize * size);

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 0.88) {
        // Vibrant brand blue gradient
        const shade = Math.floor(r * (1 - dy * 0.25));
        rawData[pxOffset] = Math.max(0, Math.min(255, shade)); // R
        rawData[pxOffset + 1] = Math.max(0, Math.min(255, g)); // G
        rawData[pxOffset + 2] = Math.max(0, Math.min(255, b)); // B
        rawData[pxOffset + 3] = a;                             // A
      } else if (dist <= 0.98) {
        // Subtle outline
        rawData[pxOffset] = 1;
        rawData[pxOffset + 1] = 85;
        rawData[pxOffset + 2] = 163;
        rawData[pxOffset + 3] = 200;
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // 4. IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idatType = Buffer.from('IDAT');
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  // 5. IEND Chunk
  const iendType = Buffer.from('IEND');
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([iendLen, iendType, iendCrc]);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcons(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sizes = [16, 48, 128];
  for (const s of sizes) {
    const pngBuf = createPng(s, 12, 135, 235); // SecureDoc Brand Blue
    const filePath = path.join(outputDir, `icon${s}.png`);
    fs.writeFileSync(filePath, pngBuf);
    console.log(`Generated icon: ${filePath} (${pngBuf.length} bytes)`);
  }
}

// Generate for assets/icons
const iconsDir = path.resolve(__dirname, 'assets/icons');
generateIcons(iconsDir);

module.exports = { generateIcons };
