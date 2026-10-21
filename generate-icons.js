const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generator for crisp PNG icons required by Chrome MV3
function createPng(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      const r = width * 0.22;
      let alpha = 255;
      
      const cx = (x < r) ? r : (x > width - r - 1) ? width - r - 1 : x;
      const cy = (y < r) ? r : (y > height - r - 1) ? height - r - 1 : y;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r) {
        alpha = 0;
      } else if (dist > r - 1) {
        alpha = Math.round(255 * (r - dist));
      }
      
      if (alpha === 0) {
        rgba[idx] = 0; rgba[idx+1] = 0; rgba[idx+2] = 0; rgba[idx+3] = 0;
        continue;
      }
      
      const t = (x + y) / (width + height);
      let red = Math.round(79 + t * (124 - 79));
      let green = Math.round(70 + t * (58 - 70));
      let blue = Math.round(229 + t * (237 - 229));
      
      const nx = (x / width - 0.5) * 2;
      const ny = (y / height - 0.5) * 2;
      
      const inCapTop = (Math.abs(nx) * 0.8 + Math.abs(ny + 0.15) * 1.3) < 0.45;
      const inCapBase = (Math.abs(nx) < 0.35 && ny >= 0.05 && ny <= 0.35 && (nx*nx + (ny-0.05)*4 < 0.35));
      const inArrow = (Math.abs(nx) < 0.12 && ny >= -0.2 && ny <= 0.25) || 
                      (ny > 0.05 && ny < 0.4 && Math.abs(nx) < (0.4 - ny));
      
      if (inCapTop || inCapBase || inArrow) {
        red = 255; green = 255; blue = 255;
      }
      
      rgba[idx] = red;
      rgba[idx+1] = green;
      rgba[idx+2] = blue;
      rgba[idx+3] = alpha;
    }
  }
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0;
    rgba.copy(scanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  }
  return (c ^ (-1)) >>> 0;
}

const iconsDir = path.join(__dirname, 'src', 'icons');
[16, 32, 48, 128].forEach(sz => {
  const png = createPng(sz, sz);
  const outPath = path.join(iconsDir, `icon-${sz}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${path.basename(outPath)} (${png.length} bytes)`);
});
