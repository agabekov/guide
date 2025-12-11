import { useRef, useState } from 'react';

interface FileUploadAreaProps {
  onFilesSelect: (files: FileList) => void;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFilesSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      onFilesSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelect(e.target.files);
    }
  };

  return (
    <>
      <div
        className={`upload-area ${isDragging ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-icon">📁</div>
        <div style={{ fontSize: '16px', color: '#1a202c', marginBottom: '8px' }}>
          Перетащите файлы сюда или нажмите для выбора
        </div>
        <div style={{ fontSize: '13px', color: '#718096' }}>
          Поддерживаются: .docx, .pdf (до 10 МБ) и изображения .jpg, .png (до 20 МБ)
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
};
