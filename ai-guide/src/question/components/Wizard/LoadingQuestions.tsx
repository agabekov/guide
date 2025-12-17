export const LoadingQuestions: React.FC = () => {
  return (
    <div className="card active">
      <div className="loading active">
        <div className="spinner"></div>
        <div className="loading-text">Анализируем контент и готовим вопросы...</div>
        <div style={{ color: '#718096', fontSize: '14px', marginTop: '8px' }}>
          Изучаем структуру текста и определяем ключевые темы
        </div>
      </div>
    </div>
  );
};
