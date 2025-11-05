import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  FiHome,
  FiEdit3,
  FiFolder,
  FiBarChart2,
  FiSettings,
  FiCpu,
  FiZap
} from 'react-icons/fi';
import LanguageSwitcher from './LanguageSwitcher';

const SidebarContainer = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 250px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  z-index: 1000;
  overflow-y: auto;
  transition: all 0.3s ease;

  [dir="rtl"] & {
    left: auto;
    right: 0;
  }
`;

const Logo = styled.div`
  padding: 20px;
  border-bottom: 1px solid #34495e;
  font-size: 18px;
  font-weight: bold;
  color: #ecf0f1;
  text-align: left;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const NavItem = styled.li`
  margin: 0;
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  gap: 4px;
  
  [dir="rtl"] & {
    flex-direction: row-reverse;
    border-left: none;
    border-right: 3px solid transparent;
    padding-right: 20px;
    padding-left: 12px;
  }
  
  &:hover {
    background-color: #34495e;
    color: #ecf0f1;
  }
  
  &.active {
    background-color: #3498db;
    color: white;
    border-left-color: #2980b9;
    
    [dir="rtl"] & {
      border-left-color: transparent;
      border-right-color: #2980b9;
    }
  }
`;

const NavIcon = styled.span`
  margin-right: 16px;
  font-size: 18px;
  display: flex;
  align-items: center;

  [dir="rtl"] & {
    margin-right: 0;
    margin-left: 16px;
  }
`;

const NavText = styled.span`
  font-size: 14px;
  font-weight: 500;
`;

const LanguageSection = styled.div`
  padding: 20px;
  border-top: 1px solid #34495e;
  margin-top: auto;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const LanguageLabel = styled.div`
  font-size: 12px;
  color: #95a5a6;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const Sidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: '/dashboard', icon: FiHome, text: t('navigation.dashboard') },
    { path: '/prompts', icon: FiEdit3, text: t('navigation.prompts') },
    { path: '/test-suites', icon: FiFolder, text: t('navigation.testSuites') },
    { path: '/results', icon: FiBarChart2, text: t('navigation.results') },
    { path: '/environments', icon: FiSettings, text: t('navigation.settings') },
    { path: '/api-test-generator', icon: FiCpu, text: t('navigation.apiTestGenerator') },
    { path: '/enhanced-ai-generator', icon: FiZap, text: t('navigation.enhancedAI') }
  ];

  return (
    <SidebarContainer className="sidebar-container">
      <Logo className="sidebar-logo">AI TestGen</Logo>
      <NavList className="sidebar-nav">
        {navItems.map((item) => (
          <NavItem key={item.path}>
            <NavLink
              to={item.path}
              className={`sidebar-nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <NavIcon className="sidebar-nav-icon">
                <item.icon />
              </NavIcon>
              <NavText>{item.text}</NavText>
            </NavLink>
          </NavItem>
        ))}
      </NavList>
      <LanguageSection className="sidebar-language-section">
        <LanguageLabel className="sidebar-language-label">{t('language.switchLanguage')}</LanguageLabel>
        <LanguageSwitcher theme="dark" />
      </LanguageSection>
    </SidebarContainer>
  );
};

export default Sidebar;
