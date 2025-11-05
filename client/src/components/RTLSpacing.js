import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const RTLSpacingContainer = styled.div`
  /* Base spacing for LTR */
  margin-left: ${props => props.ml || '0'};
  margin-right: ${props => props.mr || '0'};
  padding-left: ${props => props.pl || '0'};
  padding-right: ${props => props.pr || '0'};
  text-align: left;

  /* RTL spacing adjustments */
  [dir="rtl"] & {
    margin-left: ${props => props.mr || '0'};
    margin-right: ${props => props.ml || '0'};
    padding-left: ${props => props.pr || '0'};
    padding-right: ${props => props.pl || '0'};
    text-align: right;
  }
`;

const RTLFlexContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${props => props.gap || '8px'};

  [dir="rtl"] & {
    flex-direction: row-reverse;
  }
`;

const RTLButton = styled.button`
  margin-left: ${props => props.ml || '0'};
  margin-right: ${props => props.mr || '0'};
  padding-left: ${props => props.pl || '8px'};
  padding-right: ${props => props.pr || '8px'};

  [dir="rtl"] & {
    margin-left: ${props => props.mr || '0'};
    margin-right: ${props => props.ml || '0'};
    padding-left: ${props => props.pr || '8px'};
    padding-right: ${props => props.pl || '8px'};
  }
`;

const RTLInput = styled.input`
  text-align: left;
  direction: ltr;

  [dir="rtl"] & {
    text-align: right;
    direction: rtl;
  }
`;

const RTLText = styled.span`
  text-align: left;

  [dir="rtl"] & {
    text-align: right;
  }
`;

const RTLIcon = styled.span`
  margin-left: ${props => props.ml || '0'};
  margin-right: ${props => props.mr || '8px'};

  [dir="rtl"] & {
    margin-left: ${props => props.mr || '8px'};
    margin-right: ${props => props.ml || '0'};
  }
`;

const RTLSpacing = ({ 
  children, 
  ml, 
  mr, 
  pl, 
  pr, 
  gap,
  className,
  ...props 
}) => {
  return (
    <RTLSpacingContainer
      ml={ml}
      mr={mr}
      pl={pl}
      pr={pr}
      className={className}
      {...props}
    >
      {children}
    </RTLSpacingContainer>
  );
};

const RTLFlex = ({ 
  children, 
  gap,
  className,
  ...props 
}) => {
  return (
    <RTLFlexContainer
      gap={gap}
      className={className}
      {...props}
    >
      {children}
    </RTLFlexContainer>
  );
};

const RTLButtonComponent = ({ 
  children, 
  ml, 
  mr, 
  pl, 
  pr,
  className,
  ...props 
}) => {
  return (
    <RTLButton
      ml={ml}
      mr={mr}
      pl={pl}
      pr={pr}
      className={className}
      {...props}
    >
      {children}
    </RTLButton>
  );
};

const RTLInputComponent = ({ 
  className,
  ...props 
}) => {
  return (
    <RTLInput
      className={className}
      {...props}
    />
  );
};

const RTLTextComponent = ({ 
  children,
  className,
  ...props 
}) => {
  return (
    <RTLText
      className={className}
      {...props}
    >
      {children}
    </RTLText>
  );
};

const RTLIconComponent = ({ 
  children,
  ml, 
  mr,
  className,
  ...props 
}) => {
  return (
    <RTLIcon
      ml={ml}
      mr={mr}
      className={className}
      {...props}
    >
      {children}
    </RTLIcon>
  );
};

// Hook for RTL spacing values
export const useRTLSpacing = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  return {
    isRTL,
    spacing: {
      small: isRTL ? { ml: '4px', mr: '0' } : { ml: '0', mr: '4px' },
      medium: isRTL ? { ml: '8px', mr: '0' } : { ml: '0', mr: '8px' },
      large: isRTL ? { ml: '16px', mr: '0' } : { ml: '0', mr: '16px' },
      xlarge: isRTL ? { ml: '24px', mr: '0' } : { ml: '0', mr: '24px' }
    },
    padding: {
      small: isRTL ? { pl: '4px', pr: '0' } : { pl: '0', pr: '4px' },
      medium: isRTL ? { pl: '8px', pr: '0' } : { pl: '0', pr: '8px' },
      large: isRTL ? { pl: '16px', pr: '0' } : { pl: '0', pr: '16px' },
      xlarge: isRTL ? { pl: '24px', pr: '0' } : { pl: '0', pr: '24px' }
    }
  };
};

export {
  RTLSpacing,
  RTLFlex,
  RTLButtonComponent as RTLButton,
  RTLInputComponent as RTLInput,
  RTLTextComponent as RTLText,
  RTLIconComponent as RTLIcon
};

export default RTLSpacing;
