import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiArrowLeft, FiClock, FiPlay, FiEdit, FiTrash2, FiCalendar, FiSettings, FiCheck, FiX } from 'react-icons/fi';
import api from '../config/axios';
import ScheduleTestSuiteModal from './ScheduleTestSuiteModal';
const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  cursor: pointer;
  font-size: 14px;
  margin-right: 16px;
  
  &:hover {
    background: #e9ecef;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`;

const Content = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Card = styled.div`
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
`;

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f8f9fa;
  
  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  font-weight: 500;
  color: #6c757d;
`;

const InfoValue = styled.span`
  color: #2c3e50;
`;

const Badge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  &.blue {
    background: #e3f2fd;
    color: #1976d2;
  }
  
  &.green {
    background: #e8f5e8;
    color: #2e7d32;
  }
  
  &.orange {
    background: #fff3e0;
    color: #f57c00;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
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
  }
  
  &.secondary {
    background: #6c757d;
    color: white;
    
    &:hover {
      background: #545b62;
    }
  }
  
  &.success {
    background: #28a745;
    color: white;
    
    &:hover {
      background: #1e7e34;
    }
  }
  
  &.danger {
    background: #dc3545;
    color: white;
    
    &:hover {
      background: #c82333;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const TestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TestItem = styled.div`
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #007bff;
`;

const TestName = styled.div`
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const TestType = styled.div`
  font-size: 12px;
  color: #6c757d;
`;

const ScheduleSection = styled.div`
  margin-top: 16px;
`;

const ScheduleStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.active ? '#e8f5e8' : '#f8f9fa'};
  border-radius: 6px;
  margin-bottom: 16px;
`;

const ScheduleInfo = styled.div`
  flex: 1;
`;

const ScheduleLabel = styled.div`
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const ScheduleDetails = styled.div`
  font-size: 12px;
  color: #6c757d;
`;

const TestSuiteDetails = ({ testSuite, onBack, onEdit = () => {}, onDelete = () => {}, onRun = () => {} }) => {
  const [schedule, setSchedule] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (testSuite) {
      fetchSchedule();
    }
  }, [testSuite]);

  const fetchSchedule = async () => {
    try {
      const response = await api.get(`/test-suites/${testSuite._id}/schedule`);
      setSchedule(response.data.schedule);
    } catch (error) {
      console.log('No schedule found for this test suite');
      setSchedule(null);
    }
  };

  const handleScheduleTestSuite = () => {
    setShowScheduleModal(true);
  };

  const handleScheduleSaved = (newSchedule) => {
    setSchedule(newSchedule);
    setShowScheduleModal(false);
  };

  const handleDeleteSchedule = async () => {
    try {
      setLoading(true);
      await api.delete(`/test-suites/${testSuite._id}/schedule`);
      setSchedule(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!testSuite) {
    return <div>Loading...</div>;
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={onBack}>
          <FiArrowLeft />
          Back to Test Suites
        </BackButton>
        <Title>{testSuite.name}</Title>
      </Header>

      <Content>
        <MainContent>
          <Card>
            <CardTitle>
              <FiSettings />
              Test Suite Information
            </CardTitle>
            
            <InfoRow>
              <InfoLabel>Name</InfoLabel>
              <InfoValue>{testSuite.name}</InfoValue>
            </InfoRow>
            
            <InfoRow>
              <InfoLabel>Description</InfoLabel>
              <InfoValue>{testSuite.description || 'No description'}</InfoValue>
            </InfoRow>
            
            <InfoRow>
              <InfoLabel>Environment</InfoLabel>
              <InfoValue>
                <Badge className="blue">{testSuite.environment || 'ai_env'}</Badge>
              </InfoValue>
            </InfoRow>
            
            <InfoRow>
              <InfoLabel>Test Type</InfoLabel>
              <InfoValue>
                <Badge className="green">{testSuite.testType || 'UI'}</Badge>
              </InfoValue>
            </InfoRow>
            
            <InfoRow>
              <InfoLabel>Test Count</InfoLabel>
              <InfoValue>{testSuite.testCount || testSuite.tests?.length || testSuite.testCases?.length || 0}</InfoValue>
            </InfoRow>
            
            <InfoRow>
              <InfoLabel>Created</InfoLabel>
              <InfoValue>{new Date(testSuite.createdAt).toLocaleDateString()}</InfoValue>
            </InfoRow>
          </Card>

          <Card>
            <CardTitle>
              <FiPlay />
              Test Cases
            </CardTitle>
            
            <TestList>
              {(testSuite.tests || testSuite.testCases || []).map((test, index) => (
                <TestItem key={index}>
                  <TestName>{test.name || test.title || `Test ${index + 1}`}</TestName>
                  <TestType>{test.type || 'UI'} • {test.id || `test-${index}`}</TestType>
                </TestItem>
              ))}
            </TestList>
          </Card>
        </MainContent>

        <Sidebar>
          <Card>
            <CardTitle>
              <FiCalendar />
              Schedule
            </CardTitle>
            
            <ScheduleSection>
              {schedule ? (
                <ScheduleStatus active={schedule.enabled}>
                  <FiClock color={schedule.enabled ? '#28a745' : '#6c757d'} />
                  <ScheduleInfo>
                    <ScheduleLabel>
                      {schedule.enabled ? 'Scheduled' : 'Schedule Disabled'}
                    </ScheduleLabel>
                    <ScheduleDetails>
                      {schedule.enabled ? (
                        <>
                          Cron: {schedule.cron}<br />
                          Environment: {schedule.environmentId}<br />
                          Headless: {schedule.headless ? 'Yes' : 'No'}
                        </>
                      ) : (
                        'This test suite is not scheduled to run automatically'
                      )}
                    </ScheduleDetails>
                  </ScheduleInfo>
                </ScheduleStatus>
              ) : (
                <ScheduleStatus active={false}>
                  <FiClock color="#6c757d" />
                  <ScheduleInfo>
                    <ScheduleLabel>Not Scheduled</ScheduleLabel>
                    <ScheduleDetails>
                      This test suite is not scheduled to run automatically
                    </ScheduleDetails>
                  </ScheduleInfo>
                </ScheduleStatus>
              )}
              
              <ButtonGroup>
                <ActionButton 
                  className="primary" 
                  onClick={handleScheduleTestSuite}
                >
                  <FiCalendar />
                  {schedule ? 'Edit Schedule' : 'Schedule Test Suite'}
                </ActionButton>
                
                {schedule && (
                  <ActionButton 
                    className="danger" 
                    onClick={handleDeleteSchedule}
                    disabled={loading}
                  >
                    <FiX />
                    Delete Schedule
                  </ActionButton>
                )}
              </ButtonGroup>
            </ScheduleSection>
          </Card>

          <Card>
            <CardTitle>
              <FiSettings />
              Actions
            </CardTitle>
            
            <ButtonGroup>
              <ActionButton className="success" onClick={() => onRun(testSuite)}>
                <FiPlay />
                Run Test Suite
              </ActionButton>
              
              <ActionButton className="secondary" onClick={() => onEdit(testSuite)}>
                <FiEdit />
                Edit
              </ActionButton>
              
              <ActionButton className="danger" onClick={() => onDelete(testSuite)}>
                <FiTrash2 />
                Delete
              </ActionButton>
            </ButtonGroup>
          </Card>
        </Sidebar>
      </Content>

      {showScheduleModal && (
        <ScheduleTestSuiteModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          testSuite={testSuite}
          existingSchedule={schedule}
          onSave={handleScheduleSaved}
        />
      )}
    </Container>
  );
};

export default TestSuiteDetails;
