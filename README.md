# govkit

[![CI](https://github.com/yourusername/govkit/workflows/CI/badge.svg)](https://github.com/yourusername/govkit/actions)
[![Go Version](https://img.shields.io/badge/Go-1.20+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Go Report Card](https://goreportcard.com/badge/github.com/yourusername/govkit)](https://goreportcard.com/report/github.com/yourusername/govkit)

日本の政府系システムと連携するための CLI ツール集です。

## 概要

govkit は日本の政府系サービス（e-Gov、マイナンバーなど）を効率的に利用するためのコマンドラインツール集です。各種通知書の変換、データ処理、申請支援など、開発者や事業者が政府系システムを扱う際の煩雑な作業を自動化します。

## 利用可能なツール

### egov-viewer

e-Gov の XML 通知書を読みやすい HTML 形式に変換します。

#### 特徴

- 📄 **通知書本体の表示**: 文書番号、日付、発信者、本文を整形して表示
- 📊 **増減内訳書の表形式表示**: 保険料増減内訳を見やすいテーブルで表示
- 📋 **CSV データの可視化**: Shift-JIS エンコーディングの CSV を自動変換
- 🔄 **行列反転機能**: CSV テーブルの行と列を簡単に入れ替え
- 💅 **見やすいデザイン**: レスポンシブで読みやすい UI
- 🔢 **小数点の最適化**: 使用頻度の低い小数点部分を控えめに表示

#### 使用方法

```bash
# ディレクトリを指定
govkit egov-viewer /path/to/egov/directory

# ZIP ファイルを指定
govkit egov-viewer /path/to/egov/archive.zip
```

実行すると、カレントディレクトリに `output.html` が生成されます。

#### 対応フォーマット

| 形式 | 説明 | エンコーディング |
|------|------|-----------------|
| 通知書 XML | 日本年金機構からの通知書本体 | UTF-8 |
| 増減内訳書 XML | 保険料増減内訳書 | UTF-8 |
| CSV | ヘッダー、集計、個人別明細 | Shift-JIS / UTF-8 |

### 今後追加予定のツール

- **電子申請支援ツール**: 各種申請書類の自動生成・送信
- **その他政府系サービス連携**: e-Tax、eLTAX などとの連携

## インストール

### ソースからビルド

Go 1.20 以上が必要です。

```bash
git clone https://github.com/yourusername/govkit.git
cd govkit
make build
```

または

```bash
go install github.com/yourusername/govkit/cmd/govkit@latest
```

> **Note**: バイナリリリースは準備中です。現在はソースからのビルドをお願いします。

## 使用方法

### ヘルプの表示

```bash
# 全体のヘルプ
govkit --help

# サブコマンドのヘルプ
govkit egov-viewer --help
```

### 基本的な使い方

```bash
# e-Gov 通知書を HTML に変換
govkit egov-viewer /path/to/egov/directory

# 生成された HTML をブラウザで開く（macOS）
open output.html

# ブラウザで開く（Linux）
xdg-open output.html

# ブラウザで開く（Windows）
start output.html
```

## プロジェクト構造

```
govkit/
├── cmd/
│   └── govkit/          # メインエントリーポイント
├── internal/
│   └── egov/            # e-Gov 通知書ビューワーの実装
├── pkg/                 # 共通ユーティリティ（将来追加）
├── README.md
├── go.mod
├── Makefile
├── LICENSE
├── CONTRIBUTING.md
└── .github/
    ├── workflows/       # CI/CD 設定
    └── ISSUE_TEMPLATE/  # Issue テンプレート
```

## 開発

### 必要要件

- Go 1.20 以上
- Make（オプション）

### ビルド

```bash
# 開発ビルド
make build

# または
go build -o govkit ./cmd/govkit
```

### テスト

```bash
make test

# または
go test -v ./...
```

### Lint

```bash
make lint
```

### フォーマット

```bash
make fmt
```

## コントリビューション

コントリビューションを歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) をご覧ください。

### 新しいツールの追加

新しい政府系ツールを追加する場合は、以下の手順に従ってください：

1. `internal/<tool-name>/` ディレクトリを作成
2. ツールのロジックを実装
3. `cmd/govkit/main.go` にサブコマンドを追加
4. ドキュメントを更新
5. テストを追加

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## トラブルシューティング

### ビルドエラーが発生する場合

```bash
# キャッシュをクリア
go clean -cache

# 再ビルド
make build
```

### 文字化けが発生する場合

CSV ファイルが Shift-JIS でエンコードされていない場合、文字化けが発生する可能性があります。その場合は Issue を作成してください。

## 関連リンク

- [e-Gov 電子申請](https://www.e-gov.go.jp/)
- [日本年金機構](https://www.nenkin.go.jp/)

## Author

Created by [yuuuutsk](https://github.com/yuuuutsk)
