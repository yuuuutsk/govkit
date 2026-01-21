package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/yuuuutsk/govkit/internal/egov"
)

var (
	version = "dev"
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "govkit",
	Short: "日本の政府系システム向けツール集",
	Long: `govkit は日本の政府系システムと連携するための CLI ツール集です。

現在利用可能なツール:
  - egov-viewer: e-Gov 通知書ビューワー

将来的に追加予定のツール:
  - マイナンバー関連ツール
  - 電子申請支援ツール
  - その他政府系サービス連携ツール`,
	Version: version,
}

var egovViewerCmd = &cobra.Command{
	Use:   "egov-viewer <path>",
	Short: "e-Gov 通知書を HTML に変換",
	Long: `e-Gov の XML 通知書を読みやすい HTML 形式に変換します。

日本年金機構などから送付される e-Gov の XML 通知書は、人間が直接読むには適していません。
このコマンドは XML を解析し、ブラウザで見やすい HTML 形式に変換します。

対応フォーマット:
  - 通知書 XML（日本年金機構からの通知書本体）
  - 増減内訳書 XML（保険料増減内訳書）
  - CSV ファイル（Shift-JIS / UTF-8）

使用例:
  # ディレクトリを指定
  govkit egov-viewer /path/to/egov/directory

  # ZIP ファイルを指定
  govkit egov-viewer /path/to/egov/archive.zip`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return egov.Run(args[0])
	},
}

func init() {
	rootCmd.AddCommand(egovViewerCmd)
}
