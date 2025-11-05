import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiCloud, FiSettings, FiUpload, FiPlay, FiDownload, FiCheck, FiX, FiRefreshCw, FiChevronDown, FiChevronUp, FiSearch } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../config/axios';

// Animation for spinning icon
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const SpinningIcon = styled(FiRefreshCw)`
  ${css`animation: ${spin} 1s linear infinite;`}
`;

const LoadingMessage = styled.div`
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  color: #1976d2;
  font-size: 14px;
  
  svg {
    margin-right: 12px;
  }
`;

const APIContainer = styled.div`
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
`;

const TitleIcon = styled.span`
  margin-right: 12px;
  color: #3498db;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #7f8c8d;
  margin: 0;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
  max-width: 1200px;
  margin: 0 auto 30px auto;
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: 1px solid #e9ecef;
  position: relative;
  
  &:not(:last-child) {
    margin-bottom: 8px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #f8f9fa;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #3498db, #2980b9);
  }
`;

const SectionIcon = styled.span`
  margin-right: 12px;
  color: #3498db;
  font-size: 20px;
  display: flex;
  align-items: center;
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  margin-right: 16px;
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #3498db;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.h3`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
`;

const StepDescription = styled.p`
  margin: 0;
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
`;

const CollapseToggle = styled.button`
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-left: 8px;

  &:hover {
    background-color: #f8f9fa;
    color: #2980b9;
  }

  svg {
    font-size: 16px;
  }
`;

const CollapsibleSection = styled.div`
  overflow: hidden;
  transition: all 0.3s ease;
  max-height: ${props => props.isCollapsed ? '0' : '2000px'};
  opacity: ${props => props.isCollapsed ? '0' : '1'};
  margin-top: ${props => props.isCollapsed ? '0' : '16px'};
`;

const StepWrapper = styled.div`
  margin-bottom: 24px;
`;

const SectionDescription = styled.div`
  color: #7f8c8d;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.5;
`;

const LoadingOptions = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const OptionButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.active ? '#3498db' : '#ecf0f1'};
  border-radius: 8px;
  background-color: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#7f8c8d'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #3498db;
    color: #3498db;
  }
  
  &.active {
    background-color: #3498db;
    color: white;
  }
`;

const Description = styled.p`
  font-size: 14px;
  color: #7f8c8d;
  margin: 0 0 20px 0;
  line-height: 1.6;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  &.primary {
    background-color: #3498db;
    color: white;
    
    &:hover {
      background-color: #2980b9;
    }
  }
  
  &.secondary {
    background-color: #95a5a6;
    color: white;
    
    &:hover {
      background-color: #7f8c8d;
    }
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const GettingStarted = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const StepList = styled.ol`
  padding-left: 20px;
  margin: 0;
`;

const StepItem = styled.li`
  font-size: 14px;
  color: #2c3e50;
  margin-bottom: 12px;
  line-height: 1.6;
`;

const StepSubItem = styled.div`
  margin-left: 16px;
  margin-top: 4px;
  font-size: 13px;
  color: #7f8c8d;
`;

const GeneratedCode = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
`;

const CodeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const CodeActions = styled.div`
  display: flex;
  gap: 8px;
`;

const CodeBlock = styled.pre`
  background-color: #f8f9fa;
  border: 1px solid #ecf0f1;
  border-radius: 6px;
  padding: 16px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  color: #2c3e50;
  white-space: pre-wrap;
`;

const TabContainer = styled.div`
  margin-bottom: 20px;
`;

const TabList = styled.div`
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #7f8c8d;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
  
  &.active {
    color: #3498db;
    border-bottom-color: #3498db;
  }
  
  &:hover {
    color: #3498db;
  }
`;

const TabContent = styled.div`
  display: ${props => props.$active ? 'block' : 'none'};
  padding: 20px 0;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const FileInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const EndpointList = styled.div`
  max-height: 60vh;
  overflow-y: auto;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  margin-bottom: 24px;
  background: #fafbfc;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f3f4;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c8cd;
    border-radius: 4px;
    
    &:hover {
      background: #a8b2ba;
    }
  }
`;

const EndpointItem = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: white;
  transition: all 0.2s ease;
  
  &:first-child {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
  
  &:last-child {
    border-bottom: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
  }
  
  &:hover {
    background-color: #f8f9fa;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const Checkbox = styled.input`
  margin-right: 12px;
  cursor: pointer;
`;

const MethodBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-right: 12px;
  min-width: 60px;
  text-align: center;
  background-color: ${props => props.color};
`;

const EndpointPath = styled.div`
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #2c3e50;
`;

const EndpointSummary = styled.div`
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 4px;
`;

const RadioGroup = styled.div`
  margin-bottom: 20px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
  
  input {
    margin-right: 8px;
  }
`;

const Alert = styled.div`
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  
  &.error {
    background-color: #fdf2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }
  
  &.success {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }
  
  svg {
    margin-right: 8px;
    flex-shrink: 0;
  }
`;

const SelectionControls = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const SelectionInfo = styled.div`
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 12px;
`;

const SearchAndFilterContainer = styled.div`
  margin-bottom: 20px;
`;

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background-color: white;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }

  &::placeholder {
    color: #95a5a6;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #95a5a6;
  font-size: 16px;
  pointer-events: none;
`;

const MethodFilters = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MethodFilterButton = styled.button`
  padding: 8px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #7f8c8d;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 70px;
  justify-content: center;
  text-transform: uppercase;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: #3498db;
    color: #3498db;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  &.active {
    color: white;
    border: none;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  &.active.all {
    background-color: #34495e;
  }

  &.active.get {
    background-color: #27ae60;
  }

  &.active.post {
    background-color: #3498db;
  }

  &.active.put {
    background-color: #f39c12;
  }

  &.active.delete {
    background-color: #e74c3c;
  }

  &.active.patch {
    background-color: #9b59b6;
  }
`;

const AuthStatusContainer = styled.div`
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  font-size: 12px;
`;

const AuthStatusItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const AuthStatusLabel = styled.span`
  font-weight: 500;
  color: #495057;
  margin-right: 8px;
  min-width: 60px;
`;

const AuthStatusValue = styled.span`
  color: #6c757d;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const AuthStatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  
  &.enabled {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.disabled {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  &.none {
    background-color: #e2e3e5;
    color: #383d41;
    border: 1px solid #d6d8db;
  }
`;

const AuthFieldsContainer = styled.div`
  margin-top: 12px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
`;

const AuthFieldsTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AuthFieldRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #e9ecef;
  
  &:last-child {
    border-bottom: none;
  }
`;

const AuthFieldLabel = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: #6c757d;
  min-width: 80px;
`;

const AuthFieldValue = styled.span`
  font-size: 11px;
  color: #495057;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #ffffff;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #dee2e6;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  &.masked {
    color: #6c757d;
    font-family: inherit;
  }
`;

const AuthTypeDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const AuthTypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #bbdefb;
`;

const APITestGenerator = () => {
  const { t } = useTranslation();
  const [loadingMethod, setLoadingMethod] = useState('api');
  const [apiUrl, setApiUrl] = useState('');
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState(new Set());
  const [testType, setTestType] = useState('individual');
  const [resourceName, setResourceName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [environments, setEnvironments] = useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useLLM, setUseLLM] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [testVariations, setTestVariations] = useState(['happy-path']);
  const [collapsedSteps, setCollapsedSteps] = useState(new Set());
  const [openApiComponents, setOpenApiComponents] = useState(null);

  // Resolve an OpenAPI $ref like "#/components/schemas/User"
  const resolveRefPointer = (ref, components) => {
    if (!ref || !ref.startsWith('#/') || !components) return null;
    const parts = ref.replace('#/', '').split('/');
    let current = { components };
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }
    return current || null;
  };

  const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepClone(obj[k]);
    return out;
  };

  // Merge array of schemas for simple allOf use cases (shallow merge, later entries override earlier)
  const mergeSchemas = (schemas) => {
    const result = {};
    for (const s of schemas) {
      Object.assign(result, s);
      if (s.properties) {
        result.properties = { ...(result.properties || {}), ...s.properties };
      }
      if (s.required) {
        result.required = Array.from(new Set([...(result.required || []), ...s.required]));
      }
    }
    return result;
  };

  const resolveSchema = (schema, components, seen = new Set()) => {
    if (!schema || typeof schema !== 'object') return schema;

    // Handle $ref at this node
    if (schema.$ref) {
      if (seen.has(schema.$ref)) return {}; // prevent cycles
      seen.add(schema.$ref);
      const target = resolveRefPointer(schema.$ref, components);
      if (!target) return { ...schema }; // unresolved
      // Merge sibling keys with resolved target per OpenAPI spec
      const merged = { ...deepClone(target), ...deepClone({ ...schema, $ref: undefined }) };
      return resolveSchema(merged, components, seen);
    }

    // Handle combinators
    if (schema.allOf && Array.isArray(schema.allOf)) {
      const parts = schema.allOf.map((s) => resolveSchema(s, components, new Set(seen)));
      const merged = mergeSchemas(parts);
      const rest = { ...schema };
      delete rest.allOf;
      return resolveSchema({ ...merged, ...rest }, components, seen);
    }
    if (schema.oneOf || schema.anyOf) {
      const key = schema.oneOf ? 'oneOf' : 'anyOf';
      const items = (schema[key] || []).map((s) => resolveSchema(s, components, new Set(seen)));
      return { ...schema, [key]: items };
    }

    // Recurse into properties/array items
    const out = Array.isArray(schema) ? [] : { ...schema };
    if (schema.type === 'array' && schema.items) {
      out.items = resolveSchema(schema.items, components, new Set(seen));
    }
    if (schema.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) {
        out.properties[k] = resolveSchema(v, components, new Set(seen));
      }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      out.additionalProperties = resolveSchema(schema.additionalProperties, components, new Set(seen));
    }
    return out;
  };

  const denormalizeEndpoint = (endpoint, components) => {
    if (!components) return endpoint;
    const e = deepClone(endpoint);
    // parameters -> schema
    if (Array.isArray(e.parameters)) {
      e.parameters = e.parameters.map((p) => {
        const pClone = deepClone(p);
        if (pClone.schema) pClone.schema = resolveSchema(pClone.schema, components);
        if (pClone.content) {
          for (const [mime, obj] of Object.entries(pClone.content)) {
            if (obj.schema) pClone.content[mime].schema = resolveSchema(obj.schema, components);
          }
        }
        return pClone;
      });
    }
    // requestBody
    if (e.requestBody && e.requestBody.content) {
      for (const [mime, obj] of Object.entries(e.requestBody.content)) {
        if (obj.schema) e.requestBody.content[mime].schema = resolveSchema(obj.schema, components);
      }
    }
    // responses
    if (e.responses) {
      for (const [code, resp] of Object.entries(e.responses)) {
        if (resp && resp.content) {
          for (const [mime, obj] of Object.entries(resp.content)) {
            if (obj.schema) e.responses[code].content[mime].schema = resolveSchema(obj.schema, components);
          }
        }
      }
    }
    return e;
  };

  const denormalizeSelectedEndpointData = (selected, components) => {
    try {
      return selected.map((ep) => denormalizeEndpoint(ep, components));
    } catch (err) {
      console.warn('Denormalization failed, sending raw endpoints:', err);
      return selected;
    }
  };

  // Helper function to get authorization status from environment
  const getAuthorizationStatus = (environmentId) => {
    const environment = environments.find(env => env._id === environmentId);
    if (!environment || !environment.authorization) {
      return { 
        type: 'None', 
        enabled: false, 
        status: 'none',
        fields: []
      };
    }

    const auth = environment.authorization;
    const isEnabled = auth.enabled === true;
    const authType = (auth.type || 'Unknown').toLowerCase();
    
    // Collect available auth fields based on type
    const fields = [];
    
    // Common fields for all auth types
    if (auth.username) fields.push({ label: 'Username', value: auth.username, masked: false });
    if (auth.password) fields.push({ label: 'Password', value: '••••••••', masked: true });
    if (auth.apiKey) fields.push({ label: 'API Key', value: auth.apiKey, masked: false });
    if (auth.token) fields.push({ label: 'Token', value: auth.token, masked: false });
    
    // OAuth specific fields
    if (auth.clientId) fields.push({ label: 'Client ID', value: auth.clientId, masked: false });
    if (auth.clientSecret) fields.push({ label: 'Client Secret', value: '••••••••', masked: true });
    if (auth.scope) fields.push({ label: 'Scope', value: auth.scope, masked: false });
    if (auth.authUrl) fields.push({ label: 'Auth URL', value: auth.authUrl, masked: false });
    if (auth.tokenUrl) fields.push({ label: 'Token URL', value: auth.tokenUrl, masked: false });
    if (auth.redirectUri) fields.push({ label: 'Redirect URI', value: auth.redirectUri, masked: false });
    
    // OAuth 1.0 specific fields
    if (auth.consumerKey) fields.push({ label: 'Consumer Key', value: auth.consumerKey, masked: false });
    if (auth.consumerSecret) fields.push({ label: 'Consumer Secret', value: '••••••••', masked: true });
    if (auth.accessToken) fields.push({ label: 'Access Token', value: auth.accessToken, masked: false });
    if (auth.tokenSecret) fields.push({ label: 'Token Secret', value: '••••••••', masked: true });
    
    // Custom headers
    if (auth.customHeaders && Object.keys(auth.customHeaders).length > 0) {
      Object.entries(auth.customHeaders).forEach(([key, value]) => {
        const isSensitive = key.toLowerCase().includes('authorization') || 
                           key.toLowerCase().includes('token') || 
                           key.toLowerCase().includes('key');
        fields.push({ 
          label: `Header: ${key}`, 
          value: value, 
          masked: false 
        });
      });
    }
    
    return {
      type: auth.type || 'Unknown',
      enabled: isEnabled,
      status: isEnabled ? 'enabled' : 'disabled',
      fields: fields
    };
  };
  const [availableVariations] = useState([
    { value: 'happy-path', label: 'Happy Path', description: 'Test successful scenarios with valid data and proper assertions' },
    { value: 'error-cases', label: 'Error Cases', description: 'Test all error scenarios (400, 401, 403, 404, 422, 500) with proper error handling' },
    { value: 'edge-cases', label: 'Edge Cases', description: 'Test boundary values, empty data, null values, and malformed requests' },
    { value: 'security', label: 'Security Tests', description: 'Test authentication, authorization, input validation, and security vulnerabilities' },
    { value: 'performance', label: 'Performance Tests', description: 'Test response times, concurrent requests, and performance assertions' },
    { value: 'boundary-conditions', label: 'Boundary Conditions', description: 'Test data limits, string lengths, numeric boundaries, and size constraints' },
    { value: 'data-validation', label: 'Data Validation', description: 'Test field validation, data types, formats, and business rule validation' }
  ]);

  // Filter endpoints based on search term and selected method
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(endpoint => {
      // Filter by search term (check path and summary)
      const matchesSearch = searchTerm === '' || 
        endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (endpoint.summary && endpoint.summary.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by HTTP method
      const matchesMethod = selectedMethod === 'ALL' || endpoint.method === selectedMethod;
      
      return matchesSearch && matchesMethod;
    });
  }, [endpoints, searchTerm, selectedMethod]);

  useEffect(() => {
    fetchEnvironments();
  }, []);

  const fetchEnvironments = async () => {
    try {
      const response = await api.get('/environments');
      setEnvironments(response.data);
    } catch (error) {
      console.error('Error fetching environments:', error);
    }
  };

  const toggleStepCollapse = (stepNumber) => {
    const newCollapsedSteps = new Set(collapsedSteps);
    if (newCollapsedSteps.has(stepNumber)) {
      newCollapsedSteps.delete(stepNumber);
    } else {
      newCollapsedSteps.add(stepNumber);
    }
    setCollapsedSteps(newCollapsedSteps);
  };

  const loadEndpoints = async () => {
    setLoading(true);
    setError('');
    setEndpoints([]);
    setSelectedEndpoints(new Set());

    try {
      let response;
      
      switch (loadingMethod) {
        case 'api':
          response = await api.get('/api-test-generator/endpoints');
          break;
        case 'environment':
          if (!selectedEnvironment) {
            throw new Error('Please select an environment');
          }
          response = await api.get(`/api-test-generator/endpoints/environment/${selectedEnvironment}`);
          break;
        case 'swagger':
          if (!swaggerUrl) {
            throw new Error('Please enter a Swagger URL');
          }
          response = await api.post('/api-test-generator/endpoints/swagger', {
            swaggerUrl
          });
          break;
        case 'upload':
          if (!uploadedFile) {
            throw new Error('Please upload a file');
          }
          const formData = new FormData();
          formData.append('file', uploadedFile);
          response = await api.post('/api-test-generator/endpoints/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          break;
        default:
          throw new Error('Invalid loading method');
      }
    
      console.log('Loaded endpoints:', response.data.endpoints);
      setEndpoints(response.data.endpoints || []);
      // Capture components if backend provides them
      if (response.data.components) {
        setOpenApiComponents(response.data.components);
      } else {
        setOpenApiComponents(null);
      }
      toast.success(`Loaded ${response.data.endpoints?.length || 0} endpoints`);
    } catch (err) {
      let errorMessage = err.message;
      
      // Handle specific error types
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = 'Request timed out. API generation with LLM can take up to 2 minutes. Please try again or use standard generation.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred during generation. Please check the server logs.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please ensure the server is running.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEndpointSelection = (endpointId, checked) => {
    const newSelected = new Set(selectedEndpoints);
    if (checked) {
      newSelected.add(endpointId);
    } else {
      newSelected.delete(endpointId);
    }
    setSelectedEndpoints(newSelected);
  };

  const selectAllEndpoints = () => {
    setSelectedEndpoints(new Set(endpoints.map(ep => ep.id)));
  };

  const deselectAllEndpoints = () => {
    setSelectedEndpoints(new Set());
  };

  const generateTests = async () => {
    if (selectedEndpoints.size === 0) {
      setError('Please select at least one endpoint');
      toast.error('Please select at least one endpoint');
      return;
    }

    if (testType === 'e2e' && !resourceName.trim()) {
      setError('Please enter a resource name for E2E suite');
      toast.error('Please enter a resource name for E2E suite');
      return;
    }

    if (useLLM && !selectedEnvironment) {
      setError('Please select an LLM-enabled environment for AI-enhanced generation');
      toast.error('Please select an LLM-enabled environment for AI-enhanced generation');
      return;
    }

    if (useLLM && selectedEnvironment) {
      const selectedEnv = environments.find(env => env._id === selectedEnvironment);
      if (!selectedEnv || !selectedEnv.llmConfiguration || !selectedEnv.llmConfiguration.enabled) {
        setError('Selected environment does not have valid LLM configuration');
        toast.error('Selected environment does not have valid LLM configuration');
        return;
      }
      
      // For non-local models, check if API key is provided
      if (selectedEnv.llmConfiguration.provider !== 'local' && !selectedEnv.llmConfiguration.apiKey) {
        setError('Selected environment requires an API key for non-local models');
        toast.error('Selected environment requires an API key for non-local models');
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const selectedEndpointData = endpoints.filter(ep => selectedEndpoints.has(ep.id));
      const resolvedEndpoints = denormalizeSelectedEndpointData(selectedEndpointData, openApiComponents);
      
      const response = await api.post('/api-test-generator/generate', {
        endpoints: resolvedEndpoints,
        testType,
        resourceName: testType === 'e2e' ? resourceName : undefined,
        environmentId: selectedEnvironment,
        useLLM,
        testVariations: useLLM ? testVariations : ['happy-path'],
        components: openApiComponents || null
      });

      setGeneratedCode(response.data.testCode);
      setSuccess(`Successfully generated ${response.data.filesCreated} test file(s)`);
      toast.success(`Successfully generated ${response.data.filesCreated} test file(s)`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      setUploadedFile(file);
      setError('');
      toast.success(`File ${file.name} uploaded successfully`);
    } else {
      setError('Please upload a valid JSON file');
      toast.error('Please upload a valid JSON file');
      setUploadedFile(null);
    }
  };

  const getMethodBadgeColor = (method) => {
    const colors = {
      GET: '#27ae60',
      POST: '#3498db',
      PUT: '#f39c12',
      DELETE: '#e74c3c',
      PATCH: '#9b59b6'
    };
    return colors[method] || '#95a5a6';
  };

  const handleDownloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-test.spec.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Test file downloaded');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard');
  };

  return (
    <APIContainer>
      <Header>
        <Title>
          <TitleIcon>
            <FiCloud />
          </TitleIcon>
          {t('apiTestGenerator.title')}
        </Title>
        <Subtitle>{t('apiTestGenerator.subtitle')}</Subtitle>
      </Header>

      {error && (
        <Alert className="error">
          <FiX />
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="success">
          <FiCheck />
          {success}
        </Alert>
      )}

      <MainContent>
          <StepWrapper>
            <StepIndicator>
              <StepNumber>1</StepNumber>
              <StepContent>
                <StepTitle>Choose Endpoint Loading Method</StepTitle>
                <StepDescription>Select how you want to load your API endpoints for test generation</StepDescription>
              </StepContent>
              <CollapseToggle onClick={() => toggleStepCollapse(1)}>
                {collapsedSteps.has(1) ? <FiChevronDown /> : <FiChevronUp />}
              </CollapseToggle>
            </StepIndicator>
            
            <CollapsibleSection isCollapsed={collapsedSteps.has(1)}>
              <Section>
            <SectionTitle>
              <SectionIcon>
                <FiCloud />
              </SectionIcon>
              Endpoint Loading Configuration
            </SectionTitle>
        
        <TabContainer>
          <TabList>
            <Tab 
              className={loadingMethod === 'api' ? 'active' : ''}
              onClick={() => setLoadingMethod('api')}
            >
              From API
            </Tab>
            <Tab 
              className={loadingMethod === 'environment' ? 'active' : ''}
              onClick={() => setLoadingMethod('environment')}
            >
              From Environment
            </Tab>
            <Tab 
              className={loadingMethod === 'swagger' ? 'active' : ''}
              onClick={() => setLoadingMethod('swagger')}
            >
              Swagger URL
            </Tab>
            <Tab 
              className={loadingMethod === 'upload' ? 'active' : ''}
              onClick={() => setLoadingMethod('upload')}
            >
              Upload File
            </Tab>
          </TabList>

          <TabContent $active={loadingMethod === 'api'}>
            <SectionDescription>
              Load endpoints directly from the backend API
            </SectionDescription>
          </TabContent>

          <TabContent $active={loadingMethod === 'environment'}>
            <SectionDescription>
              Load from a configured environment's Swagger URL
            </SectionDescription>
            <Select
              value={selectedEnvironment}
              onChange={(e) => setSelectedEnvironment(e.target.value)}
            >
              <option value="">Choose an environment</option>
              {environments.map((env) => (
                <option key={env._id} value={env._id}>
                  {env.name} - {env.baseUrl}
                </option>
              ))}
            </Select>
            {selectedEnvironment && (
                    <AuthStatusContainer>
                      <AuthTypeDisplay>
                        <AuthTypeBadge>{getAuthorizationStatus(selectedEnvironment).type}</AuthTypeBadge>
                        <AuthStatusBadge className={getAuthorizationStatus(selectedEnvironment).status}>
                          {getAuthorizationStatus(selectedEnvironment).enabled ? 'Enabled' : 'Disabled'}
                        </AuthStatusBadge>
                      </AuthTypeDisplay>
                      {getAuthorizationStatus(selectedEnvironment).fields.length > 0 && (
                        <AuthFieldsContainer>
                          <AuthFieldsTitle>Authentication Details</AuthFieldsTitle>
                          {getAuthorizationStatus(selectedEnvironment).fields.map((field, index) => (
                            <AuthFieldRow key={index}>
                              <AuthFieldLabel>{field.label}:</AuthFieldLabel>
                              <AuthFieldValue className={field.masked ? 'masked' : ''}>
                                {field.value}
                              </AuthFieldValue>
                            </AuthFieldRow>
                          ))}
                        </AuthFieldsContainer>
                      )}
                    </AuthStatusContainer>
                  )}
          </TabContent>

          <TabContent $active={loadingMethod === 'swagger'}>
            <SectionDescription>
              Enter your Swagger/OpenAPI URL
            </SectionDescription>
            <Input
              type="text"
              placeholder="https://api.example.com/swagger.json"
              value={swaggerUrl}
              onChange={(e) => setSwaggerUrl(e.target.value)}
            />
          </TabContent>

          <TabContent $active={loadingMethod === 'upload'}>
            <SectionDescription>
              Upload a Swagger/OpenAPI JSON file
            </SectionDescription>
            <FileInput
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
            />
            {uploadedFile && (
              <div style={{ color: '#16a34a', fontSize: '14px', marginTop: '-12px', marginBottom: '16px' }}>
                ✓ {uploadedFile.name} uploaded
              </div>
            )}
          </TabContent>
        </TabContainer>

        <Button
          className="primary"
          onClick={loadEndpoints}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <SpinningIcon />
              Loading Endpoints...
            </>
          ) : (
            <>
              <FiDownload />
              Load Endpoints
            </>
          )}
        </Button>
      </Section>
            </CollapsibleSection>
          </StepWrapper>

      {endpoints.length > 0 && (
        <>
          <StepWrapper>
            <StepIndicator>
              <StepNumber>2</StepNumber>
              <StepContent>
                <StepTitle>Select Endpoints</StepTitle>
                <StepDescription>Choose which API endpoints you want to generate tests for</StepDescription>
              </StepContent>
              <CollapseToggle onClick={() => toggleStepCollapse(2)}>
                {collapsedSteps.has(2) ? <FiChevronDown /> : <FiChevronUp />}
              </CollapseToggle>
            </StepIndicator>
            
            <CollapsibleSection isCollapsed={collapsedSteps.has(2)}>
              <Section>
            <SectionTitle>
              <SectionIcon>
                <FiSettings />
              </SectionIcon>
              Endpoint Selection
            <SelectionControls style={{ marginLeft: 'auto' }}>
              <Button
                className="secondary"
                onClick={selectAllEndpoints}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Select All
              </Button>
              <Button
                className="secondary"
                onClick={deselectAllEndpoints}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Deselect All
              </Button>
            </SelectionControls>
          </SectionTitle>
          
          <SearchAndFilterContainer>
            <SearchContainer>
              <SearchIcon>
                <FiSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search endpoints by path or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
            
            <MethodFilters>
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                <MethodFilterButton
                  key={method}
                  className={selectedMethod === method ? `${method.toLowerCase()} active` : method.toLowerCase()}
                  onClick={() => setSelectedMethod(method)}
                >
                  {method}
                </MethodFilterButton>
              ))}
            </MethodFilters>
          </SearchAndFilterContainer>
          
          <EndpointList>
            {filteredEndpoints.map((endpoint) => (
              <EndpointItem key={endpoint.id}>
                <Checkbox
                  type="checkbox"
                  checked={selectedEndpoints.has(endpoint.id)}
                  onChange={(e) => handleEndpointSelection(endpoint.id, e.target.checked)}
                />
                <MethodBadge color={getMethodBadgeColor(endpoint.method)}>
                  {endpoint.method}
                </MethodBadge>
                <div style={{ flex: 1 }}>
                  <EndpointPath>{endpoint.path}</EndpointPath>
                  {endpoint.summary && (
                    <EndpointSummary>{endpoint.summary}</EndpointSummary>
                  )}
                </div>
                {endpoint.tags && endpoint.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {endpoint.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          padding: '2px 6px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '3px',
                          fontSize: '11px',
                          color: '#666'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </EndpointItem>
            ))}
          </EndpointList>
          
          <SelectionInfo>
            {selectedEndpoints.size} of {filteredEndpoints.length} endpoints selected
            {filteredEndpoints.length !== endpoints.length && (
              <span style={{ marginLeft: '8px', color: '#95a5a6' }}>
                (filtered from {endpoints.length} total)
              </span>
            )}
          </SelectionInfo>
        </Section>
            </CollapsibleSection>
          </StepWrapper>
        </>
      )}

      {selectedEndpoints.size > 0 && (
        <>
          <StepWrapper>
            <StepIndicator>
              <StepNumber>3</StepNumber>
              <StepContent>
                <StepTitle>Configure Test Generation</StepTitle>
                <StepDescription>Set up test generation options and parameters</StepDescription>
              </StepContent>
              <CollapseToggle onClick={() => toggleStepCollapse(3)}>
                {collapsedSteps.has(3) ? <FiChevronDown /> : <FiChevronUp />}
              </CollapseToggle>
            </StepIndicator>
            
            <CollapsibleSection isCollapsed={collapsedSteps.has(3)}>
              <Section>
            <SectionTitle>
              <SectionIcon>
                <FiPlay />
              </SectionIcon>
              Test Generation Configuration
            </SectionTitle>
          
          <RadioGroup>
            <div style={{ marginBottom: '12px', fontWeight: '500', color: '#2c3e50' }}>
              Test Generation Type
            </div>
            <RadioOption>
              <input
                type="radio"
                value="individual"
                checked={testType === 'individual'}
                onChange={(e) => setTestType(e.target.value)}
              />
              Generate Individual Tests
            </RadioOption>
            <RadioOption>
              <input
                type="radio"
                value="e2e"
                checked={testType === 'e2e'}
                onChange={(e) => setTestType(e.target.value)}
              />
              Generate E2E Suite
            </RadioOption>
          </RadioGroup>

          {testType === 'e2e' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px', fontWeight: '500', color: '#2c3e50' }}>
                Resource Name
              </div>
              <Input
                type="text"
                placeholder="e.g., user-management, product-catalog"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
              />
              <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '-12px' }}>
                This will be used as the test suite name and file prefix
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '12px', fontWeight: '500', color: '#2c3e50' }}>
              Test Generation Mode
            </div>
            <RadioGroup>
              <RadioOption>
                <input
                  type="radio"
                  value={false}
                  checked={!useLLM}
                  onChange={() => setUseLLM(false)}
                />
                Standard Generation
              </RadioOption>
              <RadioOption>
                <input
                  type="radio"
                  value={true}
                  checked={useLLM}
                  onChange={() => setUseLLM(true)}
                />
                AI-Enhanced Generation
              </RadioOption>
            </RadioGroup>
            <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '-8px' }}>
              AI-Enhanced mode generates diverse test cases with different assertions and edge cases
            </div>
          </div>

          {useLLM && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px', fontWeight: '500', color: '#2c3e50' }}>
                  LLM Environment Selection
                </div>
                <Select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="">Choose an LLM-enabled environment</option>
                  {environments
                    .filter(env => env.llmConfiguration && env.llmConfiguration.enabled)
                    .map((env) => (
                    <option key={env._id} value={env._id}>
                      {env.name} - {env.baseUrl}
                    </option>
                  ))}
                </Select>
                {selectedEnvironment && (
                  <AuthStatusContainer>
                    <AuthTypeDisplay>
                      <AuthTypeBadge>{getAuthorizationStatus(selectedEnvironment).type}</AuthTypeBadge>
                      <AuthStatusBadge className={getAuthorizationStatus(selectedEnvironment).status}>
                        {getAuthorizationStatus(selectedEnvironment).enabled ? 'Enabled' : 'Disabled'}
                      </AuthStatusBadge>
                    </AuthTypeDisplay>
                    {getAuthorizationStatus(selectedEnvironment).fields && getAuthorizationStatus(selectedEnvironment).fields.length > 0 && (
                      <AuthFieldsContainer>
                        <AuthFieldsTitle>Authentication Details</AuthFieldsTitle>
                        {getAuthorizationStatus(selectedEnvironment).fields.map((field, index) => (
                          <AuthFieldRow key={index}>
                            <AuthFieldLabel>{field.label}:</AuthFieldLabel>
                            <AuthFieldValue className={field.masked ? 'masked' : ''}>
                              {field.value}
                            </AuthFieldValue>
                          </AuthFieldRow>
                        ))}
                      </AuthFieldsContainer>
                    )}
                  </AuthStatusContainer>
                )}
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  Select an environment with LLM configuration for AI-enhanced test generation.
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '8px', fontWeight: '500', color: '#2c3e50' }}>
                  Test Variations
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {availableVariations.map((variation) => (
                    <label key={variation.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={testVariations.includes(variation.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTestVariations([...testVariations, variation.value]);
                          } else {
                            setTestVariations(testVariations.filter(v => v !== variation.value));
                          }
                        }}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#2c3e50' }}>{variation.label}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                  Select which types of test cases to generate. More variations create comprehensive test coverage.
                </div>
              </div>
            </>
          )}

          {loading && (
            <LoadingMessage>
              <SpinningIcon />
              <div>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  Generating tests, please wait...
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                  This may take up to 5 minutes for complex API specifications with LLM enhancement.
                </div>
              </div>
            </LoadingMessage>
          )}

          <Button
            className="primary"
            onClick={generateTests}
            disabled={loading}
            style={{ width: '100%', padding: '16px 24px', fontSize: '16px' }}
          >
            {loading ? (
              <>
                <SpinningIcon />
                Generating Tests...
              </>
            ) : (
              <>
                <FiCheck />
                Generate API Test{selectedEndpoints.size > 1 ? 's' : ''}
              </>
            )}
          </Button>
          </Section>
            </CollapsibleSection>
          </StepWrapper>
         </>
       )}
      </MainContent>

      {generatedCode && (
        <GeneratedCode>
          <CodeHeader>
            <h3>Generated API Test Code</h3>
            <CodeActions>
              <Button
                className="secondary"
                onClick={handleCopyCode}
              >
                <FiDownload />
                Copy Code
              </Button>
              <Button
                className="primary"
                onClick={handleDownloadCode}
              >
                <FiDownload />
                Download
              </Button>
            </CodeActions>
          </CodeHeader>
          <CodeBlock>{generatedCode}</CodeBlock>
        </GeneratedCode>
      )}
    </APIContainer>
  );
};

export default APITestGenerator;
