import type { Document, ZougenUchiwakeSho, CSVData, Appendix } from '../types';

// Shift-JIS デコード
export async function decodeShiftJIS(buffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('shift_jis');
    return decoder.decode(buffer);
  } catch {
    // フォールバック: UTF-8 として試行
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }
}

// XML ヘルパー関数
function getText(parent: Element | null, selector: string): string {
  if (!parent) return '';
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() ?? '';
}

function getTexts(parent: Element | null, selector: string): string[] {
  if (!parent) return [];
  return Array.from(parent.querySelectorAll(selector)).map(
    (el) => el.textContent?.trim() ?? ''
  );
}

function getAppendix(parent: Element | null, tagName: string): Appendix[] {
  if (!parent) return [];
  const container = parent.querySelector(tagName);
  if (!container) return [];

  const result: Appendix[] = [];
  const docLinks = container.querySelectorAll('DOCLINK');
  const appTitles = container.querySelectorAll('APPTITLE');

  for (let i = 0; i < docLinks.length; i++) {
    result.push({
      docLink: docLinks[i]?.textContent?.trim() ?? '',
      appTitle: appTitles[i]?.textContent?.trim() ?? '',
    });
  }

  return result;
}

// 通知書 XML パース
export function parseDocument(xmlString: string): Document | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  if (doc.querySelector('parsererror')) {
    return null;
  }

  const docElement = doc.querySelector('DOC');
  if (!docElement) return null;

  const body = docElement.querySelector('BODY');
  if (!body) return null;

  return {
    docNo: getText(body, 'DOCNO'),
    date: getText(body, 'DATE'),
    author: {
      name: getText(body, 'AUTHOR > NAME'),
      aff: getText(body, 'AUTHOR > AFF'),
    },
    title: getText(body, 'TITLE'),
    mainText: getTexts(body, 'MAINTXT > P'),
    appendix: getAppendix(body, 'APPENDIX'),
    mainText2: getTexts(body, 'MAINTXT2 > P'),
    appendix2: getAppendix(body, 'APPENDIX2'),
    mainText3: getTexts(body, 'MAINTXT3 > P'),
  };
}

// 増減内訳書 XML パース
export function parseZougen(xmlString: string): ZougenUchiwakeSho | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  if (doc.querySelector('parsererror')) {
    return null;
  }

  const root = doc.querySelector('ZougenUchiwakeSho');
  if (!root) return null;

  const header = root.querySelector('header');
  const kojinList = root.querySelectorAll('kojinbetsuUchiwake');
  const shukeiList = root.querySelectorAll('shukei');

  return {
    header: {
      jigyoshoName: getText(header, 'jigyoshoName'),
      jigyoshoNum: getText(header, 'jigyoshoNum'),
      jigyoshoSeiriKigo: getText(header, 'jigyoshoSeiriKigo'),
      jinInNum: getText(header, 'jinInNum'),
      nenkinJimusho2: getText(header, 'nenkinJimusho2'),
      nouhuMokutekiMonth: getText(header, 'nouhuMokutekiMonth'),
      nouhuMokutekiYear: getText(header, 'nouhuMokutekiYear'),
      nouhuMokutekiYearGengou: getText(header, 'nouhuMokutekiYearGengou'),
      oshirase: getText(header, 'oshirase'),
    },
    kojinbetsuUchiwake: Array.from(kojinList).map((k) => ({
      shimei: getText(k, 'shimei'),
      shoriYMD: getText(k, 'shoriYMD'),
      todokeshoCode: getText(k, 'todokeshoCode'),
      kenKouHokenRyou: {
        hongetsuGaku: getText(k, 'kenKouHokenRyou > hongetsuGaku'),
        zengetsuIzenKingaku: getText(k, 'kenKouHokenRyou > zengetsuIzenKingaku'),
      },
      kouseiNenkinHokenRyou: {
        hongetsuGaku: getText(k, 'kouseiNenkinHokenRyou > hongetsuGaku'),
        zengetsuIzenKingaku: getText(
          k,
          'kouseiNenkinHokenRyou > zengetsuIzenKingaku'
        ),
      },
    })),
    shukei: Array.from(shukeiList).map((s) => ({
      goukei: getText(s, 'goukei'),
      kenKouHokenRyou: {
        hongetsuGaku: getText(s, 'kenKouHokenRyou > hongetsuGaku'),
        zengetsuIzenKingaku: getText(s, 'kenKouHokenRyou > zengetsuIzenKingaku'),
      },
      kouseiNenkinHokenRyou: {
        hongetsuGaku: getText(s, 'kouseiNenkinHokenRyou > hongetsuGaku'),
        zengetsuIzenKingaku: getText(
          s,
          'kouseiNenkinHokenRyou > zengetsuIzenKingaku'
        ),
      },
    })),
  };
}

// CSV パース
export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const colCount = headers.length;

  // 各行をヘッダーの列数に合わせてパディング
  const rows = lines.slice(1).map((line) => {
    const row = parseRow(line);
    // 列数が足りない場合は空文字で埋める
    while (row.length < colCount) {
      row.push('');
    }
    // 列数が多い場合は切り詰める
    return row.slice(0, colCount);
  });

  return { headers, rows };
}

// ファイルをパースしてテンプレートデータを生成
export async function parseFiles(
  files: Map<string, Uint8Array>
): Promise<{
  documents: Document[];
  zougens: ZougenUchiwakeSho[];
  csvs: CSVData[];
}> {
  const documents: Document[] = [];
  const zougens: ZougenUchiwakeSho[] = [];
  const csvs: CSVData[] = [];

  for (const [filename, buffer] of files) {
    if (filename.endsWith('.xml')) {
      const decoder = new TextDecoder('utf-8');
      const content = decoder.decode(buffer);

      if (filename.includes('増減内訳書')) {
        const zougen = parseZougen(content);
        if (zougen) zougens.push(zougen);
      } else {
        const doc = parseDocument(content);
        if (doc) documents.push(doc);
      }
    } else if (filename.endsWith('.csv')) {
      const content = await decodeShiftJIS(buffer.buffer as ArrayBuffer);
      const parsed = parseCSV(content);
      csvs.push({
        filename,
        headers: parsed.headers,
        rows: parsed.rows,
      });
    }
  }

  return { documents, zougens, csvs };
}
