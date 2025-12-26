package egov

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/xml"
	"fmt"
	"html/template"
	"io"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/transform"
)

// 通知書本体の構造
type Document struct {
	XMLName xml.Name `xml:"DOC"`
	Body    Body     `xml:"BODY"`
}

type Body struct {
	DocNo     string      `xml:"DOCNO"`
	Date      string      `xml:"DATE"`
	Author    Author      `xml:"AUTHOR"`
	Title     string      `xml:"TITLE"`
	MainText  []Paragraph `xml:"MAINTXT>P"`
	Appendix  []Appendix  `xml:"APPENDIX"`
	MainText2 []Paragraph `xml:"MAINTXT2>P"`
	Appendix2 []Appendix  `xml:"APPENDIX2"`
	MainText3 []Paragraph `xml:"MAINTXT3>P"`
}

type Author struct {
	Name string `xml:"NAME"`
	Aff  string `xml:"AFF"`
}

type Paragraph struct {
	Text string `xml:",chardata"`
}

type Appendix struct {
	DocLink  string `xml:"DOCLINK"`
	AppTitle string `xml:"APPTITLE"`
}

// 増減内訳書の構造
type ZougenUchiwakeSho struct {
	XMLName            xml.Name             `xml:"ZougenUchiwakeSho"`
	Header             Header               `xml:"header"`
	KojinbetsuUchiwake []KojinbetsuUchiwake `xml:"kojinbetsuUchiwake"`
	Shukei             []Shukei             `xml:"shukei"`
}

type Header struct {
	JigyoshoName            string `xml:"jigyoshoName"`
	JigyoshoNum             string `xml:"jigyoshoNum"`
	JigyoshoSeiriKigo       string `xml:"jigyoshoSeiriKigo"`
	JinInNum                string `xml:"jinInNum"`
	NenkinJimusho2          string `xml:"nenkinJimusho2"`
	NouhuMokutekiMonth      string `xml:"nouhuMokutekiMonth"`
	NouhuMokutekiYear       string `xml:"nouhuMokutekiYear"`
	NouhuMokutekiYearGengou string `xml:"nouhuMokutekiYearGengou"`
	Oshirase                string `xml:"oshirase"`
}

type KojinbetsuUchiwake struct {
	Shimei                      string                   `xml:"shimei"`
	ShoriYMD                    string                   `xml:"shoriYMD"`
	TodokeshoCode               string                   `xml:"todokeshoCode"`
	HyoujyunHoushuuGetsuGakuNew HyoujyunHoushuuGetsuGaku `xml:"hyoujyunHoushuuGetsuGakuNew"`
	KenKouHokenRyou             HokenRyou                `xml:"kenKouHokenRyou"`
	KouseiNenkinHokenRyou       HokenRyou                `xml:"kouseiNenkinHokenRyou"`
}

type HyoujyunHoushuuGetsuGaku struct {
	GetsuGakuKenpo string `xml:"getsuGakuKenpo"`
	HasseiYMD      string `xml:"hasseiYMD"`
}

type HokenRyou struct {
	HongetsuGaku        string `xml:"hongetsuGaku"`
	ZengetsuIzenKingaku string `xml:"zengetsuIzenKingaku"`
}

type Shukei struct {
	Goukei                      string                   `xml:"goukei"`
	HyoujyunHoushuuGetsuGakuNew HyoujyunHoushuuGetsuGaku `xml:"hyoujyunHoushuuGetsuGakuNew"`
	KenKouHokenRyou             HokenRyou                `xml:"kenKouHokenRyou"`
	KouseiNenkinHokenRyou       HokenRyou                `xml:"kouseiNenkinHokenRyou"`
}

// CSV データ
type CSVData struct {
	Filename string
	Headers  []string
	Rows     [][]string
}

// テンプレート用データ
type TemplateData struct {
	Documents []Document
	Zougens   []ZougenUchiwakeSho
	CSVs      []CSVData
}

// Run は e-Gov 通知書ビューワーを実行します
func Run(path string) error {
	if path == "" {
		return fmt.Errorf("パスが指定されていません")
	}

	fileInfo, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("ファイル情報の取得に失敗しました: %w", err)
	}

	var files map[string][]byte
	if fileInfo.IsDir() {
		files, err = readDirectory(path)
	} else if strings.HasSuffix(strings.ToLower(path), ".zip") {
		files, err = readZipFile(path)
	} else {
		return fmt.Errorf("ディレクトリまたは ZIP ファイルを指定してください")
	}

	if err != nil {
		return fmt.Errorf("ファイルの読み込みに失敗しました: %w", err)
	}

	data := parseFiles(files)

	err = generateHTML(data)
	if err != nil {
		return fmt.Errorf("HTML の生成に失敗しました: %w", err)
	}

	fmt.Println("HTML ファイルを生成しました: output.html")
	return nil
}

func readDirectory(dirPath string) (map[string][]byte, error) {
	files := make(map[string][]byte)
	err := filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			data, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			files[filepath.Base(path)] = data
		}
		return nil
	})
	return files, err
}

func readZipFile(zipPath string) (files map[string][]byte, err error) {
	files = make(map[string][]byte)
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil, err
	}
	defer func() {
		if cerr := r.Close(); cerr != nil && err == nil {
			err = cerr
		}
	}()

	for _, f := range r.File {
		rc, err := f.Open()
		if err != nil {
			return nil, err
		}
		data, err := io.ReadAll(rc)
		if cerr := rc.Close(); cerr != nil && err == nil {
			err = cerr
		}
		if err != nil {
			return nil, err
		}
		files[filepath.Base(f.Name)] = data
	}
	return files, nil
}

func parseFiles(files map[string][]byte) TemplateData {
	var data TemplateData

	// 通知書本体を解析
	for filename, content := range files {
		if strings.HasSuffix(filename, ".xml") && !strings.Contains(filename, "増減内訳書") {
			var doc Document
			if err := xml.Unmarshal(content, &doc); err == nil {
				data.Documents = append(data.Documents, doc)
			}
		}
	}

	// 増減内訳書を解析
	for filename, content := range files {
		if strings.Contains(filename, "増減内訳書") && strings.HasSuffix(filename, ".xml") {
			var zougen ZougenUchiwakeSho
			if err := xml.Unmarshal(content, &zougen); err == nil {
				data.Zougens = append(data.Zougens, zougen)
			}
		}
	}

	// CSV ファイルを解析
	for filename, content := range files {
		if strings.HasSuffix(filename, ".csv") {
			csvData := parseCSV(filename, content)
			data.CSVs = append(data.CSVs, csvData)
		}
	}

	return data
}

func parseCSV(filename string, content []byte) CSVData {
	// Shift-JIS から UTF-8 に変換
	decoder := japanese.ShiftJIS.NewDecoder()
	utf8Content, err := io.ReadAll(transform.NewReader(bytes.NewReader(content), decoder))
	if err != nil {
		// デコードに失敗した場合は元のコンテンツを使用
		utf8Content = content
	}

	reader := csv.NewReader(strings.NewReader(string(utf8Content)))
	records, err := reader.ReadAll()
	if err != nil || len(records) == 0 {
		return CSVData{Filename: filename}
	}

	return CSVData{
		Filename: filename,
		Headers:  records[0],
		Rows:     records[1:],
	}
}

func generateHTML(data TemplateData) (err error) {
	funcMap := template.FuncMap{
		"processText": func(text string) template.HTML {
			text = strings.ReplaceAll(text, "<br/>", "<br>")
			text = strings.ReplaceAll(text, "<br />", "<br>")
			// リンクタグをそのまま出力
			return template.HTML(text)
		},
		"formatNumber": func(text string) template.HTML {
			text = strings.TrimSpace(text)
			// 小数点を含む場合、小数点部分を薄い色で表示
			if strings.Contains(text, ".") {
				parts := strings.Split(text, ".")
				if len(parts) == 2 {
					return template.HTML(parts[0] + `<span class="decimal">.` + parts[1] + `</span>`)
				}
			}
			return template.HTML(text)
		},
	}

	tmpl := template.Must(template.New("html").Funcs(funcMap).Parse(htmlTemplate))

	f, err := os.Create("output.html")
	if err != nil {
		return err
	}
	defer func() {
		if cerr := f.Close(); cerr != nil && err == nil {
			err = cerr
		}
	}()

	return tmpl.Execute(f, data)
}

const htmlTemplate = `<!DOCTYPE html>
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

            // 既存のデータを取得
            const headers = Array.from(thead.querySelectorAll('th')).map(th => th.innerHTML);
            const rows = Array.from(tbody.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.innerHTML)
            );

            // 行列を反転
            const allData = [headers, ...rows];
            const transposed = allData[0].map((_, colIndex) =>
                allData.map(row => row[colIndex])
            );

            // 新しいテーブルを構築（ヘッダーなし、すべて tbody）
            thead.innerHTML = '';
            tbody.innerHTML = transposed.map(row =>
                '<tr>' + row.map(cell => '<td>' + cell + '</td>').join('') + '</tr>'
            ).join('');
        }
    </script>
</head>
<body>
    {{range .Documents}}
    <div class="document">
        <h1>{{.Body.Title}}</h1>
        <div class="metadata">
            <div class="metadata-item"><span class="metadata-label">文書番号:</span>{{.Body.DocNo}}</div>
            <div class="metadata-item"><span class="metadata-label">日付:</span>{{.Body.Date}}</div>
            <div class="metadata-item"><span class="metadata-label">発信者:</span>{{.Body.Author.Name}}（{{.Body.Author.Aff}}）</div>
        </div>

        {{if .Body.MainText}}
        <h2>本文</h2>
        {{range .Body.MainText}}
        <div class="paragraph">{{processText .Text}}</div>
        {{end}}
        {{end}}

        {{if .Body.Appendix}}
        <h2>添付ファイル</h2>
        <ul class="appendix-list">
            {{range .Body.Appendix}}
            <li>{{.AppTitle}}</li>
            {{end}}
        </ul>
        {{end}}

        {{if .Body.MainText2}}
        {{range .Body.MainText2}}
        <div class="paragraph">{{processText .Text}}</div>
        {{end}}
        {{end}}

        {{if .Body.Appendix2}}
        <h2>CSV ファイル</h2>
        <ul class="appendix-list">
            {{range .Body.Appendix2}}
            <li>{{.AppTitle}}</li>
            {{end}}
        </ul>
        {{end}}

        {{if .Body.MainText3}}
        <h2>お知らせ</h2>
        {{range .Body.MainText3}}
        <div class="paragraph">{{processText .Text}}</div>
        {{end}}
        {{end}}
    </div>
    {{end}}

    {{range .Zougens}}
    <div class="document">
        <h1>保険料増減内訳書</h1>
        <div class="metadata">
            <div class="metadata-item"><span class="metadata-label">事業所名:</span>{{.Header.JigyoshoName}}</div>
            <div class="metadata-item"><span class="metadata-label">事業所番号:</span>{{.Header.JigyoshoNum}}</div>
            <div class="metadata-item"><span class="metadata-label">事業所整理記号:</span>{{.Header.JigyoshoSeiriKigo}}</div>
            <div class="metadata-item"><span class="metadata-label">人員数:</span>{{.Header.JinInNum}}</div>
            <div class="metadata-item"><span class="metadata-label">年金事務所:</span>{{.Header.NenkinJimusho2}}</div>
            <div class="metadata-item"><span class="metadata-label">納付対象:</span>{{.Header.NouhuMokutekiYearGengou}}{{.Header.NouhuMokutekiYear}}年{{.Header.NouhuMokutekiMonth}}月分</div>
        </div>

        {{if .Header.Oshirase}}
        <div class="paragraph">{{processText .Header.Oshirase}}</div>
        {{end}}

        {{if .KojinbetsuUchiwake}}
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
                    {{range .KojinbetsuUchiwake}}
                    <tr>
                        <td>{{.Shimei}}</td>
                        <td>{{.ShoriYMD}}</td>
                        <td>{{.TodokeshoCode}}</td>
                        <td>{{formatNumber .KenKouHokenRyou.HongetsuGaku}}</td>
                        <td>{{formatNumber .KenKouHokenRyou.ZengetsuIzenKingaku}}</td>
                        <td>{{formatNumber .KouseiNenkinHokenRyou.HongetsuGaku}}</td>
                        <td>{{formatNumber .KouseiNenkinHokenRyou.ZengetsuIzenKingaku}}</td>
                    </tr>
                    {{end}}
                </tbody>
            </table>
        </div>
        {{end}}

        {{if .Shukei}}
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
                    {{range .Shukei}}
                    <tr>
                        <td>{{.Goukei}}</td>
                        <td>{{formatNumber .KenKouHokenRyou.HongetsuGaku}}</td>
                        <td>{{formatNumber .KenKouHokenRyou.ZengetsuIzenKingaku}}</td>
                        <td>{{formatNumber .KouseiNenkinHokenRyou.HongetsuGaku}}</td>
                        <td>{{formatNumber .KouseiNenkinHokenRyou.ZengetsuIzenKingaku}}</td>
                    </tr>
                    {{end}}
                </tbody>
            </table>
        </div>
        {{end}}
    </div>
    {{end}}

    {{range $csvIndex, $csv := .CSVs}}
    <div class="document csv-section">
        <h2>CSV: {{$csv.Filename}}</h2>
        {{if $csv.Headers}}
        <button class="transpose-btn" onclick="transposeTable({{$csvIndex}})">行列を反転</button>
        <div class="csv-table" id="csv-table-{{$csvIndex}}">
            <table>
                <thead>
                    <tr>
                        {{range $csv.Headers}}
                        <th>{{.}}</th>
                        {{end}}
                    </tr>
                </thead>
                <tbody>
                    {{range $csv.Rows}}
                    <tr>
                        {{range .}}
                        <td>{{formatNumber .}}</td>
                        {{end}}
                    </tr>
                    {{end}}
                </tbody>
            </table>
        </div>
        {{end}}
    </div>
    {{end}}
</body>
</html>
`
