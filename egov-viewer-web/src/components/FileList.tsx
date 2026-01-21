interface FileListProps {
  files: Map<string, Uint8Array>;
}

export function FileList({ files }: FileListProps) {
  const getIcon = (filename: string) => {
    if (filename.endsWith('.xml')) return '📄';
    if (filename.endsWith('.csv')) return '📊';
    return '📁';
  };

  const sortedFiles = Array.from(files.keys()).sort();

  return (
    <div className="file-list">
      {sortedFiles.map((name) => (
        <div key={name} className="file-item">
          <span className="file-icon">{getIcon(name)}</span>
          {name}
        </div>
      ))}
    </div>
  );
}
