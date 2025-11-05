import React, { useState } from 'react';
import styled from 'styled-components';
import { FiZap, FiCode, FiX, FiMonitor, FiFileText } from 'react-icons/fi';
import { toast } from 'react-toastify';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 0;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  padding: 0 24px 24px 24px;
`;

const ExecutionModeContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModeOption = styled.div`
  border: 2px solid ${props => props.selected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.selected ? '#eff6ff' : 'white'};

  &:hover {
    border-color: ${props => props.selected ? '#3b82f6' : '#9ca3af'};
    background: ${props => props.selected ? '#eff6ff' : '#f9fafb'};
  }
`;

const ModeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`;

const ModeIcon = styled.div`
  color: ${props => props.selected ? '#3b82f6' : '#6b7280'};
  font-size: 20px;
`;

const ModeTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
`;

const ModeDescription = styled.p`
  color: #6b7280;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
`;

const ModeFeatures = styled.ul`
  margin: 12px 0 0 0;
  padding-left: 20px;
  color: #6b7280;
  font-size: 13px;
`;

const ModeFeature = styled.li`
  margin-bottom: 4px;
`;

const RadioInput = styled.input`
  margin-right: 12px;
  accent-color: #3b82f6;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;

  &.primary {
    background: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  }

  &.secondary {
    background: #f3f4f6;
    color: #374151;

    &:hover {
      background: #e5e7eb;
    }
  }
`;

const ExecutionModeModal = ({ isOpen, onClose, onExecute, prompt }) => {
  const [selectedMode, setSelectedMode] = useState('browser-action');

  const executionModes = [
    {
      id: 'browser-action',
      title: 'Browser Action Mode',
      description: 'Watch the browser perform actions in real-time while the LLM generates the test',
      icon: <FiMonitor />,
      features: [
        'Real-time browser interaction during LLM processing',
        'Visual feedback of actions as they happen',
        'Immediate validation of test steps',
        'Interactive debugging experience'
      ]
    },
    {
      id: 'spec-first',
      title: 'Spec-First Mode',
      description: 'Generate the test specification first, then execute it (traditional approach)',
      icon: <FiFileText />,
      features: [
        'LLM generates complete test specification',
        'Test is saved as .spec.ts file',
        'Execution happens after generation',
        'Standard Playwright workflow'
      ]
    }
  ];

  const handleExecute = () => {
    if (!selectedMode) {
      toast.error('Please select an execution mode');
      return;
    }

    onExecute(selectedMode);
    onClose();
  };

  if (!isOpen || !prompt) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiZap />
            Choose Execution Mode
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#111827' }}>Prompt: {prompt.title}</h4>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
              How would you like to execute this prompt?
            </p>
          </div>

          <ExecutionModeContainer>
            {executionModes.map((mode) => (
              <ModeOption
                key={mode.id}
                selected={selectedMode === mode.id}
                onClick={() => setSelectedMode(mode.id)}
              >
                <ModeHeader>
                  <RadioInput
                    type="radio"
                    name="executionMode"
                    value={mode.id}
                    checked={selectedMode === mode.id}
                    onChange={() => setSelectedMode(mode.id)}
                  />
                  <ModeIcon selected={selectedMode === mode.id}>
                    {mode.icon}
                  </ModeIcon>
                  <ModeTitle>{mode.title}</ModeTitle>
                </ModeHeader>
                <ModeDescription>{mode.description}</ModeDescription>
                <ModeFeatures>
                  {mode.features.map((feature, index) => (
                    <ModeFeature key={index}>{feature}</ModeFeature>
                  ))}
                </ModeFeatures>
              </ModeOption>
            ))}
          </ExecutionModeContainer>

          <ButtonContainer>
            <Button className="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button className="primary" onClick={handleExecute}>
              <FiCode />
              Execute Prompt
            </Button>
          </ButtonContainer>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ExecutionModeModal;
