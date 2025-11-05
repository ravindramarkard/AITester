import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import api from '../config/axios';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const ModalFooter = styled.div`
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;

  &.secondary {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover {
      background-color: #e5e7eb;
    }
  }

  &.primary {
    background-color: #10b981;
    color: white;

    &:hover {
      background-color: #059669;
    }

    &:disabled {
      background-color: #d1d5db;
      cursor: not-allowed;
    }
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TestInfo = styled.div`
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
`;

const TestName = styled.div`
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const TestPath = styled.div`
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
`;

const RunApiTestModal = ({ isOpen, onClose, test, onTestRun }) => {
  const [config, setConfig] = useState({
    environment: '',
    timeout: 30000,
    retries: 1,
    parallel: false
  });
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEnvironments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/environments');
      const envs = Array.isArray(response.data) ? response.data : (response.data.environments || []);
      setEnvironments(envs);
      
      // Set default environment to the first available one
      if (envs.length > 0 && config.environment === '') {
        const defaultEnv = envs[0];
        setConfig(prev => ({
          ...prev,
          environment: defaultEnv._id
        }));
        setSelectedEnvironment(defaultEnv);
      }
    } catch (error) {
      console.error('Error fetching environments:', error);
      toast.error('Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEnvironments();
    }
  }, [isOpen]);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    
    // If environment is being changed, update selectedEnvironment
    if (field === 'environment') {
      const env = environments.find(e => e._id === value);
      setSelectedEnvironment(env || null);
    }
  };

  const handleRunTest = async () => {
    if (!test) return;

    setLoading(true);
    try {
      // Get the test file path
      const testFilePath = test.filePath || test.path;
      
      if (!testFilePath) {
        toast.error('Test file path not found');
        return;
      }

      console.log(`🚀 Running API test: ${test.name}`);
      console.log(`📁 Test file: ${testFilePath}`);
      console.log(`🌍 Environment: ${selectedEnvironment?.name || 'default'}`);

      // Execute API test with environment configuration
      const response = await api.post('/api-test-execution/execute-with-environment', {
        testFile: testFilePath,
        environmentId: config.environment,
        environmentName: selectedEnvironment?.name,
        timeout: parseInt(config.timeout),
        retries: parseInt(config.retries)
      });

      if (response.data.success) {
        toast.success('API test executed successfully!');
        onTestRun && onTestRun(response.data);
        onClose();
      } else {
        toast.error(`API test execution failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error running API test:', error);
      toast.error('Failed to execute API test');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !test) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Run API Test</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <TestInfo>
            <TestName>{test.name || test.testName || 'Unknown Test'}</TestName>
            <TestPath>{test.filePath || test.path || 'No path available'}</TestPath>
          </TestInfo>

          <FormGroup>
            <Label htmlFor="environment">Environment</Label>
            <Select
              id="environment"
              value={config.environment}
              onChange={(e) => handleConfigChange('environment', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Environment</option>
              {environments.map((env) => (
                <option key={env._id} value={env._id}>
                  {env.name} ({env.key || env.name})
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={config.timeout}
              onChange={(e) => handleConfigChange('timeout', e.target.value)}
              min="1000"
              max="300000"
              step="1000"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="retries">Retries</Label>
            <Input
              id="retries"
              type="number"
              value={config.retries}
              onChange={(e) => handleConfigChange('retries', e.target.value)}
              min="0"
              max="5"
              step="1"
            />
          </FormGroup>

          {selectedEnvironment && (
            <TestInfo>
              <div style={{ marginBottom: '8px', fontWeight: '600', color: '#111827' }}>
                Environment Configuration
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                <strong>Name:</strong> {selectedEnvironment.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                <strong>Base URL:</strong> {selectedEnvironment.variables?.BASE_URL || selectedEnvironment.variables?.API_URL || 'Not set'}
              </div>
              {selectedEnvironment.authorization && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  <strong>Authorization:</strong> {selectedEnvironment.authorization.type || 'Basic'} configured
                </div>
              )}
            </TestInfo>
          )}
        </ModalBody>

        <ModalFooter>
          <Button className="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            className="primary" 
            onClick={handleRunTest} 
            disabled={loading || !config.environment}
          >
            {loading && <LoadingSpinner />}
            {loading ? 'Running...' : 'Run API Test'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default RunApiTestModal;
