import '../styles/stepper.css';

interface StepDef {
  label: string;
}

interface StepperProps {
  steps: StepDef[];
  current: number;
  max: number;
  onJump: (index: number) => void;
}

export default function Stepper({ steps, current, max, onJump }: StepperProps) {
  return (
    <div className="ds-stepper">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        const reachable = i <= max;
        return (
          <div key={i} className="ds-stepper-item">
            <button
              className={`ds-step ds-step-${state}`}
              onClick={() => reachable && onJump(i)}
              style={{ cursor: reachable ? 'pointer' : 'default', opacity: reachable ? 1 : 0.5 }}
              disabled={!reachable}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="ds-step-num">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span>{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className="ds-step-line" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
