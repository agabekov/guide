import type { UploadedFile } from '../../types';

interface FileListProps {
  files: UploadedFile[];
  onRemove: (fileId: string) => void;
}

const getFileIcon = (filename: string): string => {
  if (filename.endsWith('.docx')) return '📄';
  if (filename.endsWith('.pdf')) return '📕';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png')) return '🖼️';
  return '📎';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const FileList: React.FC<FileListProps> = ({ files, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className="file-list">
      {files.map((file) => (
        <div key={file.id} className="file-item">
          <div className="file-info">
            <div className="file-icon">{getFileIcon(file.name)}</div>
            <div className="file-details">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatFileSize(file.size)}</div>
            </div>
          </div>
          <button className="remove-btn" onClick={() => onRemove(file.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
