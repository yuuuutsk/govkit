import type { Document, ZougenUchiwakeSho, CSVData } from '../types';

function escapeHtml(text: string | undefined | null): string {
  if (text == null || text === 'undefined') return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processText(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  return result;
}

function formatNumber(text: string | undefined | null): string {
  if (text == null || text === 'undefined') return '';
  text = String(text).trim();
  if (text.includes('.')) {
    const parts = text.split('.');
    if (parts.length === 2) {
      return `${escapeHtml(parts[0])}<span class="decimal">.${escapeHtml(parts[1])}</span>`;
    }
  }
  return escapeHtml(text);
}

function renderDocuments(documents: Document[]): string {
  return documents
    .map(
      (doc) => `
    <div class="document">
        <h1>${escapeHtml(doc.title)}</h1>
        <div class="metadata">
            <div class="metadata-item"><span class="metadata-label">文書番号:</span>${escapeHtml(doc.docNo)}</div>
            <div class="metadata-item"><span class="metadata-label">日付:</span>${escapeHtml(doc.date)}</div>
            <div class="metadata-item"><span class="metadata-label">発信者:</span>${escapeHtml(doc.author.name)}（${escapeHtml(doc.author.aff)}）</div>
        </div>
        ${
          doc.mainText.length > 0
            ? `
        <h2>本文</h2>
        ${doc.mainText.map((p) => `<div class="paragraph">${processText(p)}</div>`).join('')}
        `
            : ''
        }
        ${
          doc.appendix.length > 0
            ? `
        <h2>添付ファイル</h2>
        <ul class="appendix-list">
            ${doc.appendix.map((a) => `<li>${escapeHtml(a.appTitle)}</li>`).join('')}
        </ul>
        `
            : ''
        }
        ${doc.mainText2.length > 0 ? doc.mainText2.map((p) => `<div class="paragraph">${processText(p)}</div>`).join('') : ''}
        ${
          doc.appendix2.length > 0
            ? `
        <h2>CSV ファイル</h2>
        <ul class="appendix-list">
            ${doc.appendix2.map((a) => `<li>${escapeHtml(a.appTitle)}</li>`).join('')}
        </ul>
        `
            : ''
        }
        ${
          doc.mainText3.length > 0
            ? `
        <h2>お知らせ</h2>
        ${doc.mainText3.map((p) => `<div class="paragraph">${processText(p)}</div>`).join('')}
        `
            : ''
        }
    </div>`
    )
    .join('');
}

function renderZougens(zougens: ZougenUchiwakeSho[]): string {
  return zougens
    .map(
      (z) => `
    <div class="document">
        <h1>保険料増減内訳書</h1>
        <div class="metadata">
            <div class="metadata-item"><span class="metadata-label">事業所名:</span>${escapeHtml(z.header.jigyoshoName)}</div>
            <div class="metadata-item"><span class="metadata-label">事業所番号:</span>${escapeHtml(z.header.jigyoshoNum)}</div>
            <div class="metadata-item"><span class="metadata-label">事業所整理記号:</span>${escapeHtml(z.header.jigyoshoSeiriKigo)}</div>
            <div class="metadata-item"><span class="metadata-label">人員数:</span>${escapeHtml(z.header.jinInNum)}</div>
            <div class="metadata-item"><span class="metadata-label">年金事務所:</span>${escapeHtml(z.header.nenkinJimusho2)}</div>
            <div class="metadata-item"><span class="metadata-label">納付対象:</span>${escapeHtml(z.header.nouhuMokutekiYearGengou)}${escapeHtml(z.header.nouhuMokutekiYear)}年${escapeHtml(z.header.nouhuMokutekiMonth)}月分</div>
        </div>
        ${z.header.oshirase ? `<div class="paragraph">${processText(z.header.oshirase)}</div>` : ''}
        ${
          z.kojinbetsuUchiwake.length > 0
            ? `
        <h2>個人別内訳</h2>
        <div class="csv-table">
            <table>
                <thead>
                    <tr>
                        <th>氏名</th>
                        <th>処理年月日</th>
                        <th>届出書コード</th>
                        <th>健康保険料<br>（本月額）</th>
                        <th>健康保険料<br>（前月以前額）</th>
                        <th>厚生年金保険料<br>（本月額）</th>
                        <th>厚生年金保険料<br>（前月以前額）</th>
                    </tr>
                </thead>
                <tbody>
                    ${z.kojinbetsuUchiwake
                      .map(
                        (k) => `
                    <tr>
                        <td>${escapeHtml(k.shimei)}</td>
                        <td>${escapeHtml(k.shoriYMD)}</td>
                        <td>${escapeHtml(k.todokeshoCode)}</td>
                        <td>${formatNumber(k.kenKouHokenRyou.hongetsuGaku)}</td>
                        <td>${formatNumber(k.kenKouHokenRyou.zengetsuIzenKingaku)}</td>
                        <td>${formatNumber(k.kouseiNenkinHokenRyou.hongetsuGaku)}</td>
                        <td>${formatNumber(k.kouseiNenkinHokenRyou.zengetsuIzenKingaku)}</td>
                    </tr>`
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }
        ${
          z.shukei.length > 0
            ? `
        <h2>集計</h2>
        <div class="csv-table">
            <table>
                <thead>
                    <tr>
                        <th>項目</th>
                        <th>健康保険料<br>（本月額）</th>
                        <th>健康保険料<br>（前月以前額）</th>
                        <th>厚生年金保険料<br>（本月額）</th>
                        <th>厚生年金保険料<br>（前月以前額）</th>
                    </tr>
                </thead>
                <tbody>
                    ${z.shukei
                      .map(
                        (s) => `
                    <tr>
                        <td>${escapeHtml(s.goukei)}</td>
                        <td>${formatNumber(s.kenKouHokenRyou.hongetsuGaku)}</td>
                        <td>${formatNumber(s.kenKouHokenRyou.zengetsuIzenKingaku)}</td>
                        <td>${formatNumber(s.kouseiNenkinHokenRyou.hongetsuGaku)}</td>
                        <td>${formatNumber(s.kouseiNenkinHokenRyou.zengetsuIzenKingaku)}</td>
                    </tr>`
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }
    </div>`
    )
    .join('');
}

function renderCSVs(csvs: CSVData[]): string {
  return csvs
    .map(
      (csv, index) => `
    <div class="document csv-section">
        <h2>CSV: ${escapeHtml(csv.filename)}</h2>
        ${
          csv.headers.length > 0
            ? `
        <button class="transpose-btn" onclick="transposeTable(${index})">行列を反転</button>
        <div class="csv-table" id="csv-table-${index}">
            <table>
                <thead>
                    <tr>
                        ${csv.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${csv.rows
                      .map(
                        (row) => `
                    <tr>
                        ${row.map((cell) => `<td>${formatNumber(cell)}</td>`).join('')}
                    </tr>`
                      )
                      .join('')}
                </tbody>
            </table>
        </div>
        `
            : ''
        }
    </div>`
    )
    .join('');
}

export function generateHTML(data: {
  documents: Document[];
  zougens: ZougenUchiwakeSho[];
  csvs: CSVData[];
}): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>e-Gov 通知書ビューアー</title>
    <style>
        body {
            font-family: 'Yu Gothic', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .document {
            background-color: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #003366;
            border-bottom: 3px solid #003366;
            padding-bottom: 10px;
        }
        h2 {
            color: #0066cc;
            border-left: 5px solid #0066cc;
            padding-left: 10px;
            margin-top: 30px;
        }
        .metadata {
            background-color: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .metadata-item {
            margin: 5px 0;
        }
        .metadata-label {
            font-weight: bold;
            color: #003366;
            display: inline-block;
            width: 150px;
        }
        .appendix-list {
            list-style-type: none;
            padding-left: 0;
        }
        .appendix-list li {
            background-color: #e8f4f8;
            margin: 10px 0;
            padding: 10px;
            border-left: 4px solid #0066cc;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #003366;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .paragraph {
            margin: 15px 0;
            line-height: 1.8;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .csv-section {
            margin: 20px 0;
        }
        .csv-table {
            overflow-x: auto;
        }
        .decimal {
            color: #ccc;
            font-weight: normal;
            font-size: 0.75em;
        }
        .transpose-btn {
            background-color: #0066cc;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 0;
            font-size: 14px;
        }
        .transpose-btn:hover {
            background-color: #004999;
        }
    </style>
    <script>
        function transposeTable(index) {
            const container = document.getElementById('csv-table-' + index);
            const table = container.querySelector('table');
            const thead = table.querySelector('thead');
            const tbody = table.querySelector('tbody');

            // ヘッダー行を取得（th または td）
            const headerRow = thead.querySelector('tr');
            const headers = headerRow
                ? Array.from(headerRow.querySelectorAll('th, td')).map(el => el.innerHTML)
                : [];

            // tbody の行を取得
            const rows = Array.from(tbody.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.innerHTML)
            );

            // ヘッダーがある場合は先頭に追加
            const allData = headers.length > 0 ? [headers, ...rows] : rows;

            if (allData.length === 0 || allData[0].length === 0) return;

            // 行列を反転
            const transposed = allData[0].map((_, colIndex) =>
                allData.map(row => row[colIndex] || '')
            );

            // ヘッダーを空にして tbody にすべて出力
            thead.innerHTML = '';
            tbody.innerHTML = transposed.map(row =>
                '<tr>' + row.map(cell => '<td>' + (cell || '') + '</td>').join('') + '</tr>'
            ).join('');
        }
    </script>
</head>
<body>
${renderDocuments(data.documents)}
${renderZougens(data.zougens)}
${renderCSVs(data.csvs)}
</body>
</html>`;
}
