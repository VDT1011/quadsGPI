/**
 * Mini XLSX writer — zero-dep, ~150 lines, STORED-only ZIP.
 *
 * Produces a valid .xlsx file (OOXML) Excel/LibreOffice/Numbers can open.
 * Limitations:
 *   - No compression (STORED method). Fine for small files (< few MB).
 *   - Single sheet output; inline strings (no sharedStrings).
 *   - Basic types: string, number, boolean. Dates as ISO string.
 *
 * Public:
 *   MiniXLSX.write({ sheetName, columns, rows }) → Blob
 *     columns: [{ header, key, type?, width? }]  type: 'number' | 'string' (default)
 *     rows:    [{ [key]: value }, ...]
 *
 *   MiniXLSX.download(blob, filename)  — convenience
 */
(function (global) {
  'use strict';

  // ─── CRC32 (small table-less impl) ───────────────────────
  let CRC_TABLE = null;
  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[n] = c >>> 0;
    }
    return (CRC_TABLE = t);
  }
  function crc32(data) {
    const t = crcTable();
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ t[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // ─── String escapes ──────────────────────────────────────
  function xmlEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function colLetter(n) {
    // 1 → A, 2 → B, ..., 27 → AA
    let s = '';
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  // ─── XLSX file parts ─────────────────────────────────────
  function buildContentTypes() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  }

  function buildRootRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  function buildWorkbookRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
  }

  function buildWorkbook(sheetName) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xmlEsc(sheetName || 'Sheet1').slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  }

  function buildSheet(columns, rows) {
    const xmlLines = [];
    xmlLines.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    xmlLines.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');

    // Column widths
    if (columns.some(c => c.width)) {
      xmlLines.push('<cols>');
      columns.forEach((c, i) => {
        const w = c.width || 12;
        xmlLines.push(`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`);
      });
      xmlLines.push('</cols>');
    }

    xmlLines.push('<sheetData>');

    // Header row
    xmlLines.push('<row r="1">');
    columns.forEach((c, i) => {
      const cellRef = colLetter(i + 1) + '1';
      xmlLines.push(`<c r="${cellRef}" t="inlineStr"><is><t>${xmlEsc(c.header)}</t></is></c>`);
    });
    xmlLines.push('</row>');

    // Data rows
    rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 2;
      xmlLines.push(`<row r="${rowNum}">`);
      columns.forEach((c, cIdx) => {
        const cellRef = colLetter(cIdx + 1) + rowNum;
        const val = row[c.key];
        if (val == null || val === '') {
          // skip empty cell
        } else if (c.type === 'number' && Number.isFinite(Number(val))) {
          xmlLines.push(`<c r="${cellRef}"><v>${Number(val)}</v></c>`);
        } else if (c.type === 'boolean') {
          xmlLines.push(`<c r="${cellRef}" t="b"><v>${val ? 1 : 0}</v></c>`);
        } else {
          xmlLines.push(`<c r="${cellRef}" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`);
        }
      });
      xmlLines.push('</row>');
    });

    xmlLines.push('</sheetData></worksheet>');
    return xmlLines.join('');
  }

  // ─── ZIP (STORED only, no compression) ────────────────────
  const utf8 = new TextEncoder();

  function buildZip(files) {
    // files: [{ name, content (string | Uint8Array) }]
    const entries = files.map(f => {
      const data = typeof f.content === 'string' ? utf8.encode(f.content) : f.content;
      return {
        name: f.name,
        nameBytes: utf8.encode(f.name),
        data,
        crc: crc32(data),
        size: data.length
      };
    });

    // Calculate total size
    let totalSize = 0;
    for (const e of entries) totalSize += 30 + e.nameBytes.length + e.size;
    for (const e of entries) totalSize += 46 + e.nameBytes.length;
    totalSize += 22;  // EOCD

    const buf = new Uint8Array(totalSize);
    const dv = new DataView(buf.buffer);
    let offset = 0;
    const cdEntries = [];

    // Local file headers + data
    for (const e of entries) {
      const localOffset = offset;
      cdEntries.push({ ...e, localOffset });

      dv.setUint32(offset, 0x04034b50, true); offset += 4;
      dv.setUint16(offset, 20, true); offset += 2;       // version
      dv.setUint16(offset, 0, true); offset += 2;        // flags
      dv.setUint16(offset, 0, true); offset += 2;        // method = STORED
      dv.setUint16(offset, 0, true); offset += 2;        // mod time
      dv.setUint16(offset, 0, true); offset += 2;        // mod date
      dv.setUint32(offset, e.crc, true); offset += 4;    // crc32
      dv.setUint32(offset, e.size, true); offset += 4;   // compressed
      dv.setUint32(offset, e.size, true); offset += 4;   // uncompressed
      dv.setUint16(offset, e.nameBytes.length, true); offset += 2;
      dv.setUint16(offset, 0, true); offset += 2;        // extra len
      buf.set(e.nameBytes, offset); offset += e.nameBytes.length;
      buf.set(e.data, offset); offset += e.size;
    }

    // Central directory
    const cdStart = offset;
    for (const e of cdEntries) {
      dv.setUint32(offset, 0x02014b50, true); offset += 4;
      dv.setUint16(offset, 20, true); offset += 2;       // version made
      dv.setUint16(offset, 20, true); offset += 2;       // version needed
      dv.setUint16(offset, 0, true); offset += 2;        // flags
      dv.setUint16(offset, 0, true); offset += 2;        // method
      dv.setUint16(offset, 0, true); offset += 2;        // mod time
      dv.setUint16(offset, 0, true); offset += 2;        // mod date
      dv.setUint32(offset, e.crc, true); offset += 4;
      dv.setUint32(offset, e.size, true); offset += 4;
      dv.setUint32(offset, e.size, true); offset += 4;
      dv.setUint16(offset, e.nameBytes.length, true); offset += 2;
      dv.setUint16(offset, 0, true); offset += 2;        // extra
      dv.setUint16(offset, 0, true); offset += 2;        // comment
      dv.setUint16(offset, 0, true); offset += 2;        // disk start
      dv.setUint16(offset, 0, true); offset += 2;        // internal attrs
      dv.setUint32(offset, 0, true); offset += 4;        // external attrs
      dv.setUint32(offset, e.localOffset, true); offset += 4;
      buf.set(e.nameBytes, offset); offset += e.nameBytes.length;
    }
    const cdSize = offset - cdStart;

    // EOCD
    dv.setUint32(offset, 0x06054b50, true); offset += 4;
    dv.setUint16(offset, 0, true); offset += 2;          // disk number
    dv.setUint16(offset, 0, true); offset += 2;          // disk with cd
    dv.setUint16(offset, cdEntries.length, true); offset += 2;
    dv.setUint16(offset, cdEntries.length, true); offset += 2;
    dv.setUint32(offset, cdSize, true); offset += 4;
    dv.setUint32(offset, cdStart, true); offset += 4;
    dv.setUint16(offset, 0, true); offset += 2;          // comment len

    return buf;
  }

  // ─── Public API ──────────────────────────────────────────
  function write(opts) {
    const sheetName = opts.sheetName || 'Sheet1';
    const columns = opts.columns || [];
    const rows = opts.rows || [];

    const files = [
      { name: '[Content_Types].xml', content: buildContentTypes() },
      { name: '_rels/.rels', content: buildRootRels() },
      { name: 'xl/workbook.xml', content: buildWorkbook(sheetName) },
      { name: 'xl/_rels/workbook.xml.rels', content: buildWorkbookRels() },
      { name: 'xl/worksheets/sheet1.xml', content: buildSheet(columns, rows) }
    ];

    const zipBytes = buildZip(files);
    return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ═══════════════════════════════════════════════════════
  // XLSX READER
  // ═══════════════════════════════════════════════════════
  // Parses a minimal subset of xlsx files (ZIP STORED or DEFLATE → sheet1.xml).
  // Uses browser DecompressionStream for DEFLATE.
  //
  // Returns Promise<rows: string[][]>  — 2D array of cell values (top-left = rows[0][0])

  async function read(arrayBuffer) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Trình duyệt không hỗ trợ DecompressionStream (cần Chrome 80+/Edge/Firefox 113+)');
    }
    const bytes = new Uint8Array(arrayBuffer);
    const files = parseZip(bytes);

    // 1. Shared strings (optional)
    let sst = [];
    const sstFile = files.find(f => f.name === 'xl/sharedStrings.xml');
    if (sstFile) {
      const xml = await decodeEntry(sstFile);
      sst = parseSharedStrings(xml);
    }

    // 2. First worksheet
    const sheetFile = files.find(f => /^xl\/worksheets\/sheet\d+\.xml$/.test(f.name));
    if (!sheetFile) throw new Error('Không tìm thấy sheet trong xlsx');
    const sheetXml = await decodeEntry(sheetFile);
    return parseSheet(sheetXml, sst);
  }

  function parseZip(bytes) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    // Locate End of Central Directory (EOCD) — signature 0x06054b50, scan backwards
    let eocdOffset = -1;
    const maxScan = Math.min(65557, bytes.length);
    for (let i = bytes.length - 22; i >= bytes.length - maxScan; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
    }
    if (eocdOffset < 0) throw new Error('File không phải xlsx hợp lệ (missing ZIP EOCD)');

    const cdCount = dv.getUint16(eocdOffset + 10, true);
    const cdOffset = dv.getUint32(eocdOffset + 16, true);

    const files = [];
    const dec = new TextDecoder('utf-8');
    let offset = cdOffset;
    for (let i = 0; i < cdCount; i++) {
      if (dv.getUint32(offset, true) !== 0x02014b50) throw new Error('Bad CDE @' + offset);
      const method   = dv.getUint16(offset + 10, true);
      const compSize = dv.getUint32(offset + 20, true);
      const nameLen  = dv.getUint16(offset + 28, true);
      const extraLen = dv.getUint16(offset + 30, true);
      const commLen  = dv.getUint16(offset + 32, true);
      const lOffset  = dv.getUint32(offset + 42, true);
      const name = dec.decode(bytes.slice(offset + 46, offset + 46 + nameLen));

      // Read local file header to find actual data offset
      if (dv.getUint32(lOffset, true) !== 0x04034b50) throw new Error('Bad LFH @' + lOffset);
      const lNameLen  = dv.getUint16(lOffset + 26, true);
      const lExtraLen = dv.getUint16(lOffset + 28, true);
      const dataStart = lOffset + 30 + lNameLen + lExtraLen;
      const data = bytes.slice(dataStart, dataStart + compSize);

      files.push({ name, method, data });
      offset += 46 + nameLen + extraLen + commLen;
    }
    return files;
  }

  async function decodeEntry(file) {
    let bytes;
    if (file.method === 0) {
      bytes = file.data;
    } else if (file.method === 8) {
      // DEFLATE (raw, no zlib header)
      const blob = new Blob([file.data]);
      const ds = new DecompressionStream('deflate-raw');
      const stream = blob.stream().pipeThrough(ds);
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new Error('Compression method ' + file.method + ' không hỗ trợ');
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  function parseSharedStrings(xml) {
    const sst = [];
    const reSi = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    const reT  = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let m;
    while ((m = reSi.exec(xml))) {
      const inner = m[1];
      let str = '';
      reT.lastIndex = 0;
      let tm;
      while ((tm = reT.exec(inner))) str += unescapeXml(tm[1]);
      sst.push(str);
    }
    return sst;
  }

  function colRefToIndex(letters) {
    let n = 0;
    for (let i = 0; i < letters.length; i++) {
      n = n * 26 + (letters.charCodeAt(i) - 64);
    }
    return n - 1;
  }

  function parseSheet(xml, sst) {
    const rows = [];
    const reRow = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    const reCell = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let rm;
    while ((rm = reRow.exec(xml))) {
      const inner = rm[1];
      const row = [];
      let cm;
      reCell.lastIndex = 0;
      while ((cm = reCell.exec(inner))) {
        const attrs = cm[1];
        const content = cm[2];

        const rMatch = attrs.match(/r="([A-Z]+)\d+"/);
        const tMatch = attrs.match(/t="([^"]+)"/);
        if (!rMatch) continue;
        const col = colRefToIndex(rMatch[1]);
        const type = tMatch ? tMatch[1] : '';

        let value = '';
        if (type === 's') {
          const vm = content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
          if (vm) {
            const idx = parseInt(vm[1], 10);
            value = sst[idx] != null ? sst[idx] : '';
          }
        } else if (type === 'inlineStr' || type === 'str') {
          const tm = content.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
          value = tm ? unescapeXml(tm[1]) : '';
        } else if (type === 'b') {
          const vm = content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
          value = vm && vm[1].trim() === '1';
        } else {
          // numeric or default
          const vm = content.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
          if (vm) {
            const n = parseFloat(vm[1]);
            value = Number.isFinite(n) ? n : vm[1];
          }
        }
        row[col] = value;
      }
      // Fill gaps with empty strings (sparse cells)
      for (let i = 0; i < row.length; i++) if (row[i] == null) row[i] = '';
      rows.push(row);
    }
    return rows;
  }

  function unescapeXml(s) {
    return String(s)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Convert read() output (rows array) to TSV string for use with existing parsers.
   */
  function rowsToTsv(rows) {
    return rows.map(r => r.map(c => String(c == null ? '' : c)).join('\t')).join('\n');
  }

  global.MiniXLSX = { write, download, read, rowsToTsv };
})(typeof window !== 'undefined' ? window : globalThis);
