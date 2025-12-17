export const LoadingQuestions: React.FC = () => {
  return (
    <div className="card active">
      <div className="loading active">
        <div className="spinner"></div>
        <div className="loading-text">🧠 Анализируем контент и готовим вопросы...</div>
        <div style={{ color: '#718096', fontSize: '15px', marginTop: '12px', lineHeight: '1.6' }}>
          Изучаем структуру текста, определяем ключевые темы<br/>
          и формулируем релевантные вопросы
        </div>
      </div>
    </div>
  );
};
