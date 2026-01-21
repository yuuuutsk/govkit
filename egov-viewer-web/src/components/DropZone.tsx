import { useState, useCallback } from 'react';

interface DropZoneProps {
  onFilesLoaded: (files: Map<string, Uint8Array>, folderName: string) => void;
  onError: (message: string) => void;
}

export function DropZone({ onFilesLoaded, onError }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const readDirectory = useCallback(
    async (dirHandle: FileSystemDirectoryHandle) => {
      const files = new Map<string, Uint8Array>();

      const readRecursively = async (
        handle: FileSystemDirectoryHandle
      ) => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const ext = entry.name.toLowerCase();
            if (ext.endsWith('.xml') || ext.endsWith('.csv')) {
              const fileHandle = entry as FileSystemFileHandle;
              const file = await fileHandle.getFile();
              const buffer = await file.arrayBuffer();
              files.set(entry.name, new Uint8Array(buffer));
            }
          } else if (entry.kind === 'directory') {
            await readRecursively(entry as FileSystemDirectoryHandle);
          }
        }
      };

      await readRecursively(dirHandle);

      if (files.size === 0) {
        onError('対応するファイル（XML, CSV）が見つかりませんでした');
        return;
      }

      onFilesLoaded(files, dirHandle.name);
    },
    [onFilesLoaded, onError]
  );

  const handleClick = useCallback(async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      await readDirectory(dirHandle);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onError('フォルダの選択に失敗しました: ' + err.message);
      }
    }
  }, [readDirectory, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      for (const item of items) {
        if (item.kind === 'file') {
          const entry = await item.getAsFileSystemHandle();
          if (entry && entry.kind === 'directory') {
            await readDirectory(entry as FileSystemDirectoryHandle);
            return;
          }
        }
      }

      onError('フォルダをドロップしてください');
    },
    [readDirectory, onError]
  );

  return (
    <div
      className={`drop-zone ${isDragOver ? 'dragover' : ''}`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="drop-zone-icon">📁</div>
      <div className="drop-zone-text">
        フォルダをドロップ、またはクリックして選択
      </div>
      <div className="drop-zone-hint">
        XML、CSV ファイルを含むフォルダを選択してください
      </div>
    </div>
  );
}
