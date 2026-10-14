/* Escritor/leitor ZIP mínimo (método "stored", sem compressão) usado para gerar .docx */
const ZIP = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = buf => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  function dosDateTime(d = new Date()) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }

  function create(files, type = 'application/zip') {
    const enc = new TextEncoder();
    const { time, date } = dosDateTime();
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true);
      lh.setUint16(12, date, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true);
      lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true);
      ch.setUint16(14, date, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, a) => s + a.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type });
  }

  /* Lê entradas não comprimidas de um ZIP (suficiente para os .docx gerados por esta aplicação) */
  function readStored(buffer) {
    const view = new DataView(buffer), out = {}, dec = new TextDecoder();
    let p = 0;
    while (p + 30 <= buffer.byteLength && view.getUint32(p, true) === 0x04034b50) {
      const flags = view.getUint16(p + 6, true);
      const method = view.getUint16(p + 8, true);
      const size = view.getUint32(p + 18, true);
      const nlen = view.getUint16(p + 26, true);
      const elen = view.getUint16(p + 28, true);
      const name = dec.decode(new Uint8Array(buffer, p + 30, nlen));
      const start = p + 30 + nlen + elen;
      if (flags & 8) break;
      if (method === 0) out[name] = new Uint8Array(buffer, start, size);
      p = start + size;
    }
    return out;
  }

  async function inflate(data) {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* Lê qualquer ZIP (stored + deflate) a partir do directório central */
  async function read(buffer) {
    const v = new DataView(buffer), u8 = new Uint8Array(buffer), dec = new TextDecoder();
    let eocd = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
      if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('O ficheiro não é um pacote ZIP/Office válido.');
    const count = v.getUint16(eocd + 10, true);
    let p = v.getUint32(eocd + 16, true);
    const out = {};
    for (let n = 0; n < count && v.getUint32(p, true) === 0x02014b50; n++) {
      const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
      const nlen = v.getUint16(p + 28, true), elen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
      const off = v.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
      const data = u8.subarray(start, start + csize);
      if (method === 0) out[name] = data;
      else if (method === 8) out[name] = await inflate(data);
      p += 46 + nlen + elen + clen;
    }
    return out;
  }

  return { create, readStored, read };
})();
