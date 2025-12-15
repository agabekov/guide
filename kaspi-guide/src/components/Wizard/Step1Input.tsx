import { FileUploadArea, FileList } from '../shared';
import type { UploadedFile } from '../../types';

interface Step1InputProps {
  sourceText: string;
  files: UploadedFile[];
  onSourceTextChange: (text: string) => void;
  onFilesSelect: (files: FileList) => void;
  onFileRemove: (fileId: string) => void;
  onGenerateQuestions: () => void;
  canGenerate: boolean;
}

export const Step1Input: React.FC<Step1InputProps> = ({
  sourceText,
  files,
  onSourceTextChange,
  onFilesSelect,
  onFileRemove,
  onGenerateQuestions,
  canGenerate,
}) => {
  return (
    <div className="card active">
      <div className="card-title">Шаг 1. Загрузите информацию о продукте</div>

      <textarea
        value={sourceText}
        onChange={(e) => onSourceTextChange(e.target.value)}
        placeholder="Вставьте текст с информацией о продукте или функции...
Например: описание нового функционала, инструкции, технические характеристики"
      />

      <FileUploadArea onFilesSelect={onFilesSelect} />

      <FileList files={files} onRemove={onFileRemove} />

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onGenerateQuestions} disabled={!canGenerate}>
          ✨ Подготовить вопросы
        </button>
      </div>
    </div>
  );
};
