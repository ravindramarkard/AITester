import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiX, FiClock, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi';
import api from '../config/axios';

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
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
`;

const ModalTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  color: #6c757d;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    color: #495057;
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
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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
`;

const CheckboxLabel = styled.label`
  font-size: 14px;
  color: #2c3e50;
  cursor: pointer;
`;

const HelpText = styled.div`
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
`;

const InlineLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #e9ecef;
  background: #f8f9fa;
  color: #495057;
  border-radius: 6px;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  transition: background 0.2s ease;
  &:hover { background: #eef2f5; }
`;

const CronExamples = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
`;

const CronExample = styled.div`
  font-size: 12px;
  color: #495057;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CronCode = styled.code`
  background: #e9ecef;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
  font-size: 14px;
  margin-bottom: 16px;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  color: #155724;
  font-size: 14px;
  margin-bottom: 16px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  
  &.primary {
    background: #007bff;
    color: white;
    
    &:hover {
      background: #0056b3;
    }
    
    &:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }
  }
  
  &.secondary {
    background: #6c757d;
    color: white;
    
    &:hover {
      background: #545b62;
    }
  }
`;

const ScheduleTestSuiteModal = ({ isOpen, onClose, testSuite, existingSchedule, onSave }) => {
  const [formData, setFormData] = useState({
    cron: '',
    enabled: true,
    environmentId: '',
    headless: true,
    workers: 1
  });
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCronHelper, setShowCronHelper] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEnvironments();
      if (existingSchedule) {
        setFormData({
          cron: existingSchedule.cron || '',
          enabled: existingSchedule.enabled !== false,
          environmentId: existingSchedule.environmentId || '',
          headless: existingSchedule.headless !== false,
          workers: existingSchedule.workers || 1
        });
      } else {
        setFormData({
          cron: '',
          enabled: true,
          environmentId: '',
          headless: true,
          workers: 1
        });
      }
      setError('');
      setSuccess('');
      setShowCronHelper(false);
    }
  }, [isOpen, existingSchedule]);

  const fetchEnvironments = async () => {
    try {
      const response = await api.get('/environments');
      setEnvironments(response.data || []);
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  };

  const validateCron = (cron) => {
    // Accept 5 fields and allow digits, *, /, -, , in each field.
    const parts = (cron || '').trim().split(/\s+/);
    if (parts.length !== 5) return false;
    const token = /^[0-9*,\/\-]+$/;
    return parts.every(p => token.test(p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cron.trim()) {
      setError('Cron expression is required');
      return;
    }
    
    if (!validateCron(formData.cron)) {
      setError('Invalid cron expression. Please use format: minute hour day month weekday');
      return;
    }
    
    if (!formData.environmentId) {
      setError('Environment is required');
      return;
    }

    const suiteId = (testSuite && (testSuite._id || testSuite.id)) || null;
    if (!suiteId) {
      setError('Test suite not found');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await api.post(`/test-suites/${suiteId}/schedule`, formData);
      
      setSuccess('Schedule saved successfully!');
      setTimeout(() => {
        onSave(response.data.schedule);
      }, 1000);
      
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const applyCron = (value) => {
    handleInputChange('cron', value.trim());
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiClock />
            {existingSchedule ? 'Edit Schedule' : 'Schedule Test Suite'}
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {error && (
            <ErrorMessage>
              <FiAlertCircle />
              {error}
            </ErrorMessage>
          )}
          
          {success && (
            <SuccessMessage>
              <FiCheck />
              {success}
            </SuccessMessage>
          )}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <InlineLabelRow>
                <Label htmlFor="cron">Cron Expression *</Label>
                <div>
                  <IconButton type="button" onClick={() => setShowCronHelper(v => !v)} title="Open Cron generator">
                    <FiInfo />
                  </IconButton>
                </div>
              </InlineLabelRow>
              <Input
                id="cron"
                type="text"
                value={formData.cron}
                onChange={(e) => handleInputChange('cron', e.target.value)}
                placeholder="0 9 * * 1-5"
                required
              />
              <HelpText>
                Schedule when to run the test suite (minute hour day month weekday)
              </HelpText>

              {showCronHelper && (
                <div style={{ marginTop: '10px' }}>
                  <CronExamples>
                    <CronExample><strong>Quick presets</strong></CronExample>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0 12px' }}>
                      <Button type="button" className="secondary" onClick={() => applyCron('*/5 * * * *')}>Every 5 min</Button>
                      <Button type="button" className="secondary" onClick={() => applyCron('*/15 * * * *')}>Every 15 min</Button>
                      <Button type="button" className="secondary" onClick={() => applyCron('0 */2 * * *')}>Every 2 hours</Button>
                      <Button type="button" className="secondary" onClick={() => applyCron('0 9 * * *')}>Daily 09:00</Button>
                      <Button type="button" className="secondary" onClick={() => applyCron('0 9 * * 1-5')}>Weekdays 09:00</Button>
                      <Button type="button" className="secondary" onClick={() => applyCron('0 0 * * 0')}>Sundays 00:00</Button>
                    </div>

                    <CronExample><strong>Custom builders</strong></CronExample>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>Every</span>
                        <Input style={{ width: '70px' }} type="number" min="1" max="59" defaultValue={2} onChange={(e) => applyCron(`*/${Math.max(1, Math.min(59, parseInt(e.target.value) || 1))} * * * *`)} />
                        <span>minute(s)</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>Every</span>
                        <Input style={{ width: '70px' }} type="number" min="1" max="23" defaultValue={2} onChange={(e) => applyCron(`0 */${Math.max(1, Math.min(23, parseInt(e.target.value) || 1))} * * *`)} />
                        <span>hour(s) at minute 0</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>Daily at</span>
                        <Input style={{ width: '70px' }} type="number" min="0" max="23" placeholder="HH" onChange={(e) => {
                          const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                          const mEl = (e.currentTarget.parentElement?.querySelector('[data-minute]'));
                          const m = mEl ? Math.max(0, Math.min(59, parseInt(mEl.value) || 0)) : 0;
                          applyCron(`${m} ${h} * * *`);
                        }} />
                        <span>:</span>
                        <Input data-minute style={{ width: '70px' }} type="number" min="0" max="59" placeholder="MM" onChange={(e) => {
                          const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                          const hEl = (e.currentTarget.parentElement?.querySelector('input[type=number]:not([data-minute])'));
                          const h = hEl ? Math.max(0, Math.min(23, parseInt(hEl.value) || 0)) : 0;
                          applyCron(`${m} ${h} * * *`);
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>Weekly on</span>
                        <Select style={{ width: '150px' }} onChange={(e) => {
                          const w = e.target.value;
                          applyCron(`0 9 * * ${w}`);
                        }} defaultValue="1">
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </Select>
                        <span>at 09:00 (adjust above as needed)</span>
                      </div>
                    </div>
                  </CronExamples>
                </div>
              )}

              <CronExamples>
                <CronExample>
                  <CronCode>0 9 * * 1-5</CronCode> - Every weekday at 9:00 AM
                </CronExample>
                <CronExample>
                  <CronCode>0 */2 * * *</CronCode> - Every 2 hours
                </CronExample>
                <CronExample>
                  <CronCode>0 0 * * 0</CronCode> - Every Sunday at midnight
                </CronExample>
                <CronExample>
                  <CronCode>30 14 * * *</CronCode> - Every day at 2:30 PM
                </CronExample>
              </CronExamples>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="environmentId">Environment *</Label>
              <Select
                id="environmentId"
                value={formData.environmentId}
                onChange={(e) => handleInputChange('environmentId', e.target.value)}
                required
              >
                <option value="">Select Environment</option>
                {environments.map((env) => (
                  <option key={env._id} value={env._id}>
                    {env.name} ({env.environment})
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => handleInputChange('enabled', e.target.checked)}
                />
                <CheckboxLabel htmlFor="enabled">
                  Enable Schedule
                </CheckboxLabel>
              </CheckboxContainer>
              <HelpText>
                Uncheck to disable the schedule without deleting it
              </HelpText>
            </FormGroup>

            <FormGroup>
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  id="headless"
                  checked={formData.headless}
                  onChange={(e) => handleInputChange('headless', e.target.checked)}
                />
                <CheckboxLabel htmlFor="headless">
                  Run in Headless Mode
                </CheckboxLabel>
              </CheckboxContainer>
              <HelpText>
                Run tests without opening browser windows
              </HelpText>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workers">Number of Workers</Label>
              <Input
                id="workers"
                type="number"
                min="1"
                max="10"
                value={formData.workers}
                onChange={(e) => handleInputChange('workers', parseInt(e.target.value) || 1)}
              />
              <HelpText>
                Number of parallel test workers (1-10)
              </HelpText>
            </FormGroup>
          </form>
        </ModalBody>

        <ModalFooter>
          <Button type="button" className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="primary" 
            onClick={handleSubmit}
            disabled={loading}
          >
            <FiCheck />
            {loading ? 'Saving...' : (existingSchedule ? 'Update Schedule' : 'Save Schedule')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

export default ScheduleTestSuiteModal;
