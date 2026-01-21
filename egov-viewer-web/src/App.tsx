import { useState, useCallback } from 'react';
import { DropZone } from './components/DropZone';
import { FileList } from './components/FileList';
import { parseFiles } from './utils/parsers';
import { generateHTML } from './utils/htmlGenerator';
import type { Document, ZougenUchiwakeSho, CSVData } from './types';
import './App.css';

type Status = {
  type: 'success' | 'error';
  message: string;
} | null;

type HistoryItem = {
  folderName: string;
  timestamp: number;
  data: {
    documents: Document[];
    zougens: ZougenUchiwakeSho[];
    csvs: CSVData[];
  };
};

const STORAGE_KEY = 'egov-viewer-history';

function loadHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage が使えない場合は無視
  }
}

function App() {
  const [files, setFiles] = useState<Map<string, Uint8Array>>(new Map());
  const [folderName, setFolderName] = useState<string>('');
  const [status, setStatus] = useState<Status>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory());

  const handleFilesLoaded = useCallback((loadedFiles: Map<string, Uint8Array>, dirName: string) => {
    setFiles(loadedFiles);
    setFolderName(dirName);
    setStatus({
      type: 'success',
      message: `${loadedFiles.size} 個のファイルを読み込みました`,
    });
  }, []);

  const handleError = useCallback((message: string) => {
    setStatus({ type: 'error', message });
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      const data = await parseFiles(files);

      if (
        data.documents.length === 0 &&
        data.zougens.length === 0 &&
        data.csvs.length === 0
      ) {
        setStatus({ type: 'error', message: '有効なデータが見つかりませんでした' });
        return;
      }

      // 履歴に保存
      const newItem: HistoryItem = {
        folderName: folderName || '不明なフォルダ',
        timestamp: Date.now(),
        data,
      };
      const newHistory = [newItem, ...history.filter(h => h.folderName !== folderName)].slice(0, 10);
      setHistory(newHistory);
      saveHistory(newHistory);

      const html = generateHTML(data);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      setStatus({
        type: 'error',
        message: `生成に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`,
      });
    }
  }, [files, folderName, history]);

  const handleOpenHistory = useCallback((item: HistoryItem) => {
    const html = generateHTML(item.data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, []);

  const handleDeleteHistory = useCallback((folderName: string) => {
    const newHistory = history.filter(h => h.folderName !== folderName);
    setHistory(newHistory);
    saveHistory(newHistory);
  }, [history]);

  const handleReset = useCallback(() => {
    setFiles(new Map());
    setFolderName('');
    setStatus(null);
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container">
      <h1>e-Gov 通知書ビューアー</h1>
      <p className="subtitle">e-Gov の XML 通知書を読みやすい形式で表示します</p>

      <DropZone onFilesLoaded={handleFilesLoaded} onError={handleError} />

      {files.size > 0 && <FileList files={files} />}

      {status && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {files.size > 0 && (
        <div className="button-container">
          <button className="btn" onClick={handleGenerate}>
            別タブで開く
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            リセット
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="history-section">
          <h2>履歴</h2>
          <div className="history-list">
            {history.map((item) => (
              <div key={item.folderName + item.timestamp} className="history-item">
                <div className="history-info">
                  <span className="history-folder">{item.folderName}</span>
                  <span className="history-date">{formatDate(item.timestamp)}</span>
                </div>
                <div className="history-actions">
                  <button
                    className="btn-small"
                    onClick={() => handleOpenHistory(item)}
                  >
                    開く
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteHistory(item.folderName)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="note">
        <div className="note-title">対応フォーマット</div>
        <ul>
          <li>通知書 XML（日本年金機構からの通知書本体）</li>
          <li>増減内訳書 XML（保険料増減内訳書）</li>
          <li>CSV ファイル（Shift-JIS / UTF-8）</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
