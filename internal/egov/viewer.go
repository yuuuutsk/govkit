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

	tmpl := template.Must(template.New("template.gohtml").Funcs(funcMap).ParseFiles("internal/egov/template.gohtml"))

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
