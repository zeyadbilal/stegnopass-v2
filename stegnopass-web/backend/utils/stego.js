const Jimp = require("jimp");

function toBits(data) {
  let bits = "";
  for (let i = 0; i < data.length; i++) {
    bits += data.charCodeAt(i).toString(2).padStart(8, "0");
  }
  return bits;
}

function fromBits(bits) {
  let s = "";
  for (let i = 0; i < bits.length; i += 8) {
    const b = bits.slice(i, i + 8);
    if (b.length === 8) s += String.fromCharCode(parseInt(b, 2));
  }
  return s;
}

async function lsbEmbed(imagePath, data, outputPath) {
  const img = await Jimp.read(imagePath);
  const bits = toBits(data);
  const header = bits.length.toString(2).padStart(32, "0");
  const full = header + bits;
  const capacity = img.bitmap.width * img.bitmap.height * 3;
  if (full.length > capacity) {
    throw new Error(
      `Image too small: needs ${full.length} bits, has ${capacity}`
    );
  }

  let idx = 0;
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, offset) {
    if (idx >= full.length) return;
    if (idx < full.length) {
      this.bitmap.data[offset] = (this.bitmap.data[offset] & ~1) | parseInt(full[idx]);
      idx++;
    }
    if (idx < full.length) {
      this.bitmap.data[offset + 1] = (this.bitmap.data[offset + 1] & ~1) | parseInt(full[idx]);
      idx++;
    }
    if (idx < full.length) {
      this.bitmap.data[offset + 2] = (this.bitmap.data[offset + 2] & ~1) | parseInt(full[idx]);
      idx++;
    }
  });

  await img.writeAsync(outputPath);
  return outputPath;
}

async function lsbExtract(imagePath) {
  const img = await Jimp.read(imagePath);
  let bits = "";
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (_, __, offset) {
    bits += (this.bitmap.data[offset] & 1).toString();
    bits += (this.bitmap.data[offset + 1] & 1).toString();
    bits += (this.bitmap.data[offset + 2] & 1).toString();
  });

  const n = parseInt(bits.slice(0, 32), 2);
  if (!n || n > bits.length - 32) throw new Error("No LSB data found");
  return fromBits(bits.slice(32, 32 + n));
}

module.exports = { lsbEmbed, lsbExtract };
