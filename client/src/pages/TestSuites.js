import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { FiPlus, FiPlay, FiBarChart2, FiSettings, FiTrash2, FiEdit3, FiRefreshCw, FiClipboard, FiBox, FiFileText, FiTag, FiEye } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../config/axios';
import TestSuiteDetails from '../components/TestSuiteDetails';
import CreateTestSuiteModal from '../components/CreateTestSuiteModal';
import EditTestSuiteModal from '../components/EditTestSuiteModal';
import RunTestSuiteModal from '../components/RunTestSuiteModal';

const TestSuitesContainer = styled.div`
  padding: 0;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const TabsContainer = styled.div`
  background: white;
  border-radius: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 0;
`;

const TabsList = styled.div`
  display: flex;
  border-bottom: 1px solid #e9ecef;
  padding: 0 20px;
`;

const Tab = styled.button`
  padding: 16px 24px;
  border: none;
  background: none;
  color: ${props => props.$active ? '#007bff' : '#6c757d'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? '#007bff' : 'transparent'};
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: #007bff;
  }
`;

const TabContent = styled.div`
  background: white;
  border-radius: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #28a745;
  font-size: 14px;
  font-weight: 500;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: #28a745;
  border-radius: 50%;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: #0056b3;
  }
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  
  &:hover {
    background: #0056b3;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
`;

const TableHead = styled.thead`
  background: #f8f9fa;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e9ecef;
  
  &:hover {
    background: #f8f9fa;
  }
`;

const TableHeader = styled.th`
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
`;

const TableCell = styled.td`
  padding: 16px;
  vertical-align: middle;
`;

const SuiteName = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
`;

const SuiteDescription = styled.div`
  font-size: 11px;
  color: #6c757d;
`;

const Badge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  
  &.blue {
    background: #e3f2fd;
    color: #1976d2;
  }
  
  &.green {
    background: #e8f5e8;
    color: #2e7d32;
  }
`;

const SettingsInfo = styled.div`
  font-size: 11px;
  color: #6c757d;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  margin-right: 4px;
  
  &.success {
    background: #28a745;
    color: white;
    
    &:hover {
      background: #1e7e34;
    }
  }
  
  &.secondary {
    background: #6c757d;
    color: white;
    
    &:hover {
      background: #545b62;
    }
  }
  
  &.danger {
    background: #dc3545;
    color: white;
    
    &:hover {
      background: #c82333;
    }
  }
  
  &.info {
    background: #17a2b8;
    color: white;
    
    &:hover {
      background: #138496;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  font-size: 14px;
  margin: 0;
`;

const TestSuites = () => {
  const location = useLocation();
  const [testSuites, setTestSuites] = useState([]);
  const [activeTab, setActiveTab] = useState('TEST SUITES');
  const [stats, setStats] = useState({
    totalSuites: 0,
    totalTests: 0,
    totalCollections: 0,
    totalEnvironments: 0,
    availableTags: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Test Suite Details state
  const [showTestSuiteDetails, setShowTestSuiteDetails] = useState(false);
  const [selectedTestSuite, setSelectedTestSuite] = useState(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [editingTestSuite, setEditingTestSuite] = useState(null);
  const [runningTestSuite, setRunningTestSuite] = useState(null);

  const tabs = [
    { id: 'OVERVIEW', label: 'OVERVIEW', icon: FiBarChart2 },
    { id: 'TEST SUITES', label: 'TEST MANAGEMENT', icon: FiClipboard },
    { id: 'COLLECTIONS', label: 'COLLECTIONS', icon: FiBox },
    { id: 'ALL TESTS', label: 'ALL TESTS', icon: FiFileText },
    { id: 'TAGS', label: 'TAGS', icon: FiTag }
  ];

  useEffect(() => {
    fetchTestSuites();
    fetchStats();
  }, []);

  // Handle URL hash to set active tab
  useEffect(() => {
    const hash = location.hash.substring(1); // Remove the # symbol
    console.log('URL hash:', hash);
    console.log('Current activeTab:', activeTab);
    if (hash === 'all-tests') {
      console.log('Setting activeTab to ALL TESTS');
      setActiveTab('ALL TESTS');
    }
  }, [location.hash, activeTab]);

  const fetchTestSuites = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test-suites');
      setTestSuites(response.data.testSuites || []);
    } catch (error) {
      console.error('Error fetching test suites:', error);
      toast.error('Failed to fetch test suites');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/analytics/stats');
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewTestSuite = (testSuite) => {
    setSelectedTestSuite(testSuite);
    setShowTestSuiteDetails(true);
  };

  const handleBackToList = () => {
    setShowTestSuiteDetails(false);
    setSelectedTestSuite(null);
  };

  const handleEditTestSuite = (testSuite) => {
    setEditingTestSuite(testSuite);
    setShowEditModal(true);
  };

  const handleDeleteTestSuite = async (testSuite) => {
    if (window.confirm(`Are you sure you want to delete "${testSuite.name}"?`)) {
      try {
        await api.delete(`/test-suites/${testSuite._id}`);
        toast.success('Test suite deleted successfully');
        fetchTestSuites();
      } catch (error) {
        console.error('Error deleting test suite:', error);
        toast.error('Failed to delete test suite');
      }
    }
  };

  const handleRunTestSuite = (testSuite) => {
    setRunningTestSuite(testSuite);
    setShowRunModal(true);
  };

  const handleTestSuiteCreated = () => {
    setShowCreateModal(false);
    fetchTestSuites();
    toast.success('Test suite created successfully');
  };

  const handleTestSuiteUpdated = () => {
    setShowEditModal(false);
    setEditingTestSuite(null);
    fetchTestSuites();
    toast.success('Test suite updated successfully');
  };

  const handleTestSuiteExecuted = () => {
    setShowRunModal(false);
    setRunningTestSuite(null);
    toast.success('Test suite execution started');
  };

  if (showTestSuiteDetails && selectedTestSuite) {
    return (
      <TestSuiteDetails
        testSuite={selectedTestSuite}
        onBack={handleBackToList}
        onEdit={handleEditTestSuite}
        onDelete={handleDeleteTestSuite}
        onRun={handleRunTestSuite}
      />
    );
  }

  return (
    <TestSuitesContainer>
      <TabsContainer>
        <TabsList>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon />
              {tab.label}
            </Tab>
          ))}
        </TabsList>

        <TabContent>
          {activeTab === 'OVERVIEW' && (
            <div style={{ padding: '20px' }}>
              <h3>Overview</h3>
              <p>Test suite overview and statistics will be displayed here.</p>
            </div>
          )}

          {activeTab === 'TEST SUITES' && (
            <div>
              <Header>
                <div>
                  <Title>Test Suite Management</Title>
                  <StatusIndicator>
                    <StatusDot />
                    • Connected
                  </StatusIndicator>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <RefreshButton onClick={fetchTestSuites}>
                    <FiRefreshCw />
                    Refresh
                  </RefreshButton>
                  <CreateButton onClick={() => setShowCreateModal(true)}>
                    <FiPlus />
                    CREATE TEST SUITE
                  </CreateButton>
                </div>
              </Header>

              <div style={{ padding: '0 20px 20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <FiClipboard />
                  Test Suites
                </h3>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    Loading test suites...
                  </div>
                ) : testSuites.length === 0 ? (
                  <EmptyState>
                    <EmptyTitle>No Test Suites Found</EmptyTitle>
                    <EmptyDescription>
                      Create your first test suite to get started with automated testing.
                    </EmptyDescription>
                  </EmptyState>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>Name</TableHeader>
                        <TableHeader>Environment</TableHeader>
                        <TableHeader>Test Cases</TableHeader>
                        <TableHeader>Tags</TableHeader>
                        <TableHeader>Settings</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <tbody>
                      {testSuites.map((suite) => (
                        <TableRow key={suite._id}>
                          <TableCell>
                            <SuiteName>{suite.name}</SuiteName>
                            <SuiteDescription>{suite.description || suite.name}</SuiteDescription>
                          </TableCell>
                          <TableCell>
                            <Badge className="blue">
                              {suite.environment || 'ai_env'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {suite.testCount || suite.tests?.length || suite.testCases?.length || 0}
                          </TableCell>
                          <TableCell>
                            {suite.tags && suite.tags.length > 0 ? (
                              suite.tags.map((tag, index) => (
                                <Badge key={index} className="green" style={{ marginRight: '4px' }}>
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span style={{ color: '#6c757d' }}>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SettingsInfo>
                              chromium • {suite.type === 'custom' ? 'Headed' : 'Headless'}
                            </SettingsInfo>
                          </TableCell>
                          <TableCell>
                            <ActionButton 
                              className="info" 
                              onClick={() => handleViewTestSuite(suite)}
                              title="View Details"
                            >
                              <FiEye />
                              View
                            </ActionButton>
                            <ActionButton 
                              className="success" 
                              onClick={() => handleRunTestSuite(suite)}
                              title="Run Test Suite"
                            >
                              <FiPlay />
                              RUN
                            </ActionButton>
                            <ActionButton 
                              className="secondary" 
                              onClick={() => handleEditTestSuite(suite)}
                              title="Edit Test Suite"
                            >
                              <FiEdit3 />
                            </ActionButton>
                            <ActionButton 
                              className="danger" 
                              onClick={() => handleDeleteTestSuite(suite)}
                              title="Delete Test Suite"
                            >
                              <FiTrash2 />
                            </ActionButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'COLLECTIONS' && (
            <div style={{ padding: '20px' }}>
              <h3>Collections</h3>
              <p>Test collections management will be displayed here.</p>
            </div>
          )}

          {activeTab === 'ALL TESTS' && (
            <div style={{ padding: '20px' }}>
              <h3>All Tests</h3>
              <p>All individual tests will be displayed here.</p>
            </div>
          )}

          {activeTab === 'TAGS' && (
            <div style={{ padding: '20px' }}>
              <h3>Tags</h3>
              <p>Test tags management will be displayed here.</p>
            </div>
          )}
        </TabContent>
      </TabsContainer>

      {/* Modals */}
      {showCreateModal && (
        <CreateTestSuiteModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTestSuite={handleTestSuiteCreated}
        />
      )}

      {showEditModal && editingTestSuite && (
        <EditTestSuiteModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingTestSuite(null);
          }}
          testSuite={editingTestSuite}
          onSave={handleTestSuiteUpdated}
        />
      )}

      {showRunModal && runningTestSuite && (
        <RunTestSuiteModal
          isOpen={showRunModal}
          onClose={() => {
            setShowRunModal(false);
            setRunningTestSuite(null);
          }}
          testSuite={runningTestSuite}
          onExecute={handleTestSuiteExecuted}
        />
      )}
    </TestSuitesContainer>
  );
};

export default TestSuites;
