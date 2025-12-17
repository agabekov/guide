import type { WizardStep } from '../../types';

interface WizardStepperProps {
  currentStep: WizardStep;
}

interface Step {
  key: WizardStep | WizardStep[];
  label: string;
  number: number;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({ currentStep }) => {
  const steps: Step[] = [
    { key: 'step1', label: 'Информация', number: 1 },
    { key: ['step2', 'loadingQuestions'], label: 'Вопросы', number: 2 },
    { key: ['step3', 'loadingAnswers'], label: 'Ответы', number: 3 },
    { key: ['step4', 'loadingEdits'], label: 'Редактирование', number: 4 },
    { key: 'step5', label: 'Экспорт', number: 5 },
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => {
      if (Array.isArray(step.key)) {
        return step.key.includes(currentStep);
      }
      return step.key === currentStep;
    });
  };

  const currentIndex = getCurrentStepIndex();

  const getStepStatus = (index: number) => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="wizard-stepper">
      <div className="stepper-container">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.number} className="stepper-item-wrapper">
              <div className={`stepper-item ${status}`}>
                <div className="stepper-circle">
                  {status === 'completed' ? (
                    <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="stepper-number">{step.number}</span>
                  )}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
              {!isLast && <div className={`stepper-line ${status === 'completed' ? 'completed' : ''}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
