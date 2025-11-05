import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';

const LanguageContainer = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
  
  [dir="rtl"] & {
    text-align: right;
  }
`;

const LanguageButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${props => props.theme === 'dark' ? '#374151' : '#f3f4f6'};
  border: 1px solid ${props => props.theme === 'dark' ? '#4b5563' : '#d1d5db'};
  border-radius: 6px;
  color: ${props => props.theme === 'dark' ? '#f9fafb' : '#374151'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
  justify-content: space-between;
  width: 100%;

  [dir="rtl"] & {
    flex-direction: row-reverse;
    text-align: right;
  }

  &:hover {
    background: ${props => props.theme === 'dark' ? '#4b5563' : '#e5e7eb'};
    border-color: ${props => props.theme === 'dark' ? '#6b7280' : '#9ca3af'};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const LanguageIcon = styled(FiGlobe)`
  font-size: 16px;
`;

const ChevronIcon = styled(FiChevronDown)`
  font-size: 14px;
  transition: transform 0.2s;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${props => props.theme === 'dark' ? '#1f2937' : 'white'};
  border: 1px solid ${props => props.theme === 'dark' ? '#374151' : '#d1d5db'};
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 1000;
  margin-top: 4px;
  overflow: hidden;

  [dir="rtl"] & {
    left: auto;
    right: 0;
    text-align: right;
  }
`;

const LanguageOption = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: ${props => props.theme === 'dark' ? '#1f2937' : 'white'};
  border: none;
  color: ${props => props.theme === 'dark' ? '#f9fafb' : '#374151'};
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s;

  [dir="rtl"] & {
    flex-direction: row-reverse;
    text-align: right;
  }

  &:hover {
    background: ${props => props.theme === 'dark' ? '#374151' : '#f3f4f6'};
  }

  &.active {
    background: ${props => props.theme === 'dark' ? '#1e40af' : '#dbeafe'};
    color: ${props => props.theme === 'dark' ? '#dbeafe' : '#1e40af'};
    font-weight: 600;
  }
`;

const LanguageFlag = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;
`;

const LanguageName = styled.span`
  flex: 1;
`;

const LanguageSwitcher = ({ theme = 'light', size = 'medium' }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    {
      code: 'en',
      name: t('language.english'),
      flag: '🇺🇸',
      dir: 'ltr'
    },
    {
      code: 'ar',
      name: t('language.arabic'),
      flag: '🇦🇪',
      dir: 'rtl'
    }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    
    // Update document direction
    const selectedLang = languages.find(lang => lang.code === languageCode);
    if (selectedLang) {
      document.documentElement.dir = selectedLang.dir;
      document.documentElement.lang = languageCode;
    }
    
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <LanguageContainer>
      <LanguageButton 
        onClick={toggleDropdown}
        theme={theme}
        aria-label={t('language.switchLanguage')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <LanguageIcon />
        <span>{currentLanguage.name}</span>
        <ChevronIcon isOpen={isOpen} />
      </LanguageButton>

      {isOpen && (
        <Dropdown theme={theme}>
          {languages.map((language) => (
            <LanguageOption
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={language.code === i18n.language ? 'active' : ''}
              theme={theme}
            >
              <LanguageFlag>{language.flag}</LanguageFlag>
              <LanguageName>{language.name}</LanguageName>
            </LanguageOption>
          ))}
        </Dropdown>
      )}
    </LanguageContainer>
  );
};

export default LanguageSwitcher;
