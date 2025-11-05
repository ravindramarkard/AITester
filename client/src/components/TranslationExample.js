import React from 'react';
import styled from 'styled-components';
import { useAutoTranslation } from './TranslationWrapper';
import { FiGlobe, FiSettings, FiUser, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const ExampleContainer = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin: 20px 0;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
`;

const Title = styled.h2`
  margin: 0;
  color: #2c3e50;
`;

const Section = styled.div`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #34495e;
  font-size: 16px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  
  &.primary {
    background: #3498db;
    color: white;
    
    &:hover {
      background: #2980b9;
    }
  }
  
  &.secondary {
    background: #95a5a6;
    color: white;
    
    &:hover {
      background: #7f8c8d;
    }
  }
  
  &.success {
    background: #27ae60;
    color: white;
    
    &:hover {
      background: #229954;
    }
  }
  
  &.danger {
    background: #e74c3c;
    color: white;
    
    &:hover {
      background: #c0392b;
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Message = styled.div`
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
  
  &.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  &.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  &.warning {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }
  
  &.info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
`;

const TableHeader = styled.th`
  background: #f8f9fa;
  padding: 10px;
  text-align: left;
  border: 1px solid #dee2e6;
  font-weight: 500;
`;

const TableCell = styled.td`
  padding: 10px;
  border: 1px solid #dee2e6;
`;

const TableRow = styled.tr`
  &:nth-child(even) {
    background: #f8f9fa;
  }
  
  &:hover {
    background: #e9ecef;
  }
`;

const Icon = styled.span`
  margin-right: 8px;
  color: #7f8c8d;
`;

const TranslationExample = () => {
  const {
    translateTitle,
    translateButton,
    translateLabel,
    translatePlaceholder,
    translateMessage,
    translateSuccess,
    translateError,
    translateWarning,
    translateInfo,
    translateCommon,
    translateNavigation,
    translateForm,
    translateTable,
    translateStatus,
    translateAction,
    translateDescription,
    translateHelp,
    translateTooltip,
    translateValidation,
    translateOption,
    translateTab,
    translateMenu,
    translateHeader,
    translateFooter,
    translateSidebar,
    translateModal,
    translateDialog,
    translateNotification,
    translateAlert,
    translateBanner,
    translateCard,
    translateList,
    translateGrid,
    translatePanel,
    translateSection,
    translateArea,
    translateZone,
    translateRegion,
    translateBlock,
    translateElement,
    translateComponent,
    translateWidget,
    translateFeature,
    translateFunction,
    translateMethod,
    translateProperty,
    translateAttribute,
    translateParameter,
    translateArgument,
    translateVariable,
    translateConstant,
    translateEnum,
    translateType,
    translateClass,
    translateInterface,
    translateNamespace,
    translateModule,
    translatePackage,
    translateLibrary,
    translateFramework,
    translateTool,
    translateUtility,
    translateService,
    translateApi,
    translateEndpoint,
    translateRoute,
    translatePath,
    translateUrl,
    translateLink,
    translateReference,
    translateResource,
    translateAsset,
    translateFile,
    translateDocument,
    translatePage,
    translateScreen,
    translateView,
    translateWindow,
    translateDialog,
    translatePopup,
    translateOverlay,
    translateTooltip,
    translateHint,
    translateTip,
    translateHelp,
    translateGuide,
    translateTutorial,
    translateExample,
    translateSample,
    translateDemo,
    translateTest,
    translateSpec,
    translateSuite,
    translateCase,
    translateScenario,
    translateStep,
    translateTask,
    translateJob,
    translateWork,
    translateProcess,
    translateFlow,
    translatePipeline,
    translateStage,
    translatePhase,
    translateStep,
    translateAction,
    translateOperation,
    translateFunction,
    translateMethod,
    translateProcedure,
    translateAlgorithm,
    translateLogic,
    translateRule,
    translatePolicy,
    translateStrategy,
    translatePattern,
    translateTemplate,
    translateModel,
    translateSchema,
    translateStructure,
    translateFormat,
    translateLayout,
    translateDesign,
    translateStyle,
    translateTheme,
    translateSkin,
    translateAppearance,
    translateLook,
    translateFeel,
    translateExperience,
    translateInteraction,
    translateBehavior,
    translateResponse,
    translateReaction,
    translateFeedback,
    translateInput,
    translateOutput,
    translateResult,
    translateOutcome,
    translateEffect,
    translateImpact,
    translateInfluence,
    translateChange,
    translateModification,
    translateUpdate,
    translateUpgrade,
    translateEnhancement,
    translateImprovement,
    translateOptimization,
    translatePerformance,
    translateEfficiency,
    translateSpeed,
    translateTime,
    translateDuration,
    translatePeriod,
    translateInterval,
    translateFrequency,
    translateRate,
    translateRatio,
    translatePercentage,
    translateProportion,
    translateAmount,
    translateQuantity,
    translateNumber,
    translateValue,
    translateData,
    translateInformation,
    translateContent,
    translateText,
    translateMessage,
    translateCommunication,
    translateNotification,
    translateAlert,
    translateWarning,
    translateError,
    translateSuccess,
    translateInfo,
    translateDebug,
    translateLog,
    translateTrace,
    translateMonitor,
    translateWatch,
    translateObserve,
    translateInspect,
    translateExamine,
    translateReview,
    translateAudit,
    translateAssess,
    translateEvaluate,
    translateAnalyze,
    translateStudy,
    translateResearch,
    translateInvestigate,
    translateExplore,
    translateDiscover,
    translateFind,
    translateLocate,
    translateIdentify,
    translateRecognize,
    translateDetect,
    translateSpot,
    translateNotice,
    translateObserve,
    translateSee,
    translateView,
    translateLook,
    translateWatch,
    translateGaze,
    translateStare,
    translateGlance,
    translatePeek,
    translatePeep,
    translateSpy,
    translateSnoop,
    translateEavesdrop,
    translateListen,
    translateHear,
    translateOverhear,
    translateEavesdrop,
    translateMonitor,
    translateSurveil,
    translateTrack,
    translateTrace,
    translateFollow,
    translatePursue,
    translateChase,
    translateHunt,
    translateSeek,
    translateSearch,
    translateLookFor,
    translateFind,
    translateLocate,
    translateDiscover,
    translateUncover,
    translateReveal,
    translateExpose,
    translateShow,
    translateDisplay,
    translatePresent,
    translateDemonstrate,
    translateIllustrate,
    translateExemplify,
    translateRepresent,
    translateSymbolize,
    translateSignify,
    translateMean,
    translateIndicate,
    translateSuggest,
    translateImply,
    translateHint,
    translateClue,
    translateSignal,
    translateSign,
    translateMark,
    translateLabel,
    translateTag,
    translateFlag,
    translateStar,
    translateBookmark,
    translatePin,
    translateStick,
    translateHighlight,
    translateEmphasize,
    translateStress,
    translateAccent,
    translateUnderline,
    translateBold,
    translateItalic,
    translateFormat,
    translateStyle,
    translateDesign,
    translateCreate,
    translateMake,
    translateBuild,
    translateConstruct,
    translateFabricate,
    translateManufacture,
    translateProduce,
    translateGenerate,
    translateDevelop,
    translateGrow,
    translateCultivate,
    translateNurture,
    translateFoster,
    translatePromote,
    translateAdvance,
    translateProgress,
    translateImprove,
    translateEnhance,
    translateUpgrade,
    translateUpdate,
    translateModify,
    translateChange,
    translateAlter,
    translateAdjust,
    translateTune,
    translateCalibrate,
    translateFineTune,
    translateOptimize,
    translatePerfect,
    translatePolish,
    translateRefine,
    translateHone,
    translateSharpen,
    translateWhet,
    translateGrind,
    translateFile,
    translateSand,
    translateSmooth,
    translatePolish,
    translateBuff,
    translateShine,
    translateGloss,
    translateLuster,
    translateSheen,
    translateGleam,
    translateGlow,
    translateRadiate,
    translateEmit,
    translateGiveOff
  } = useAutoTranslation();

  return (
    <ExampleContainer>
      <Header>
        <FiGlobe />
        <Title>{translateTitle('translationExample')}</Title>
      </Header>

      <Section>
        <SectionTitle>{translateSection('buttons')}</SectionTitle>
        <ButtonGroup>
          <Button className="primary">{translateButton('create')}</Button>
          <Button className="secondary">{translateButton('edit')}</Button>
          <Button className="success">{translateButton('save')}</Button>
          <Button className="danger">{translateButton('delete')}</Button>
        </ButtonGroup>
      </Section>

      <Section>
        <SectionTitle>{translateSection('forms')}</SectionTitle>
        <FormGroup>
          <Label>
            <Icon><FiUser /></Icon>
            {translateLabel('name')}
          </Label>
          <Input placeholder={translatePlaceholder('enterName')} />
        </FormGroup>
        
        <FormGroup>
          <Label>
            <Icon><FiMail /></Icon>
            {translateLabel('email')}
          </Label>
          <Input type="email" placeholder={translatePlaceholder('enterEmail')} />
        </FormGroup>
        
        <FormGroup>
          <Label>
            <Icon><FiPhone /></Icon>
            {translateLabel('phone')}
          </Label>
          <Input type="tel" placeholder={translatePlaceholder('enterPhone')} />
        </FormGroup>
        
        <FormGroup>
          <Label>
            <Icon><FiMapPin /></Icon>
            {translateLabel('country')}
          </Label>
          <Select>
            <option>{translateOption('selectCountry')}</option>
            <option value="us">{translateOption('unitedStates')}</option>
            <option value="uk">{translateOption('unitedKingdom')}</option>
            <option value="ca">{translateOption('canada')}</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>{translateLabel('message')}</Label>
          <TextArea placeholder={translatePlaceholder('enterMessage')} />
        </FormGroup>
      </Section>

      <Section>
        <SectionTitle>{translateSection('messages')}</SectionTitle>
        <Message className="success">
          {translateSuccess('testGenerated')}
        </Message>
        <Message className="error">
          {translateError('generic')}
        </Message>
        <Message className="warning">
          {translateWarning('validation')}
        </Message>
        <Message className="info">
          {translateInfo('loading')}
        </Message>
      </Section>

      <Section>
        <SectionTitle>{translateSection('tables')}</SectionTitle>
        <Table>
          <thead>
            <tr>
              <TableHeader>{translateTable('name')}</TableHeader>
              <TableHeader>{translateTable('email')}</TableHeader>
              <TableHeader>{translateTable('status')}</TableHeader>
              <TableHeader>{translateTable('actions')}</TableHeader>
            </tr>
          </thead>
          <tbody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>{translateStatus('active')}</TableCell>
              <TableCell>
                <Button className="secondary" style={{ marginRight: '5px' }}>
                  {translateButton('edit')}
                </Button>
                <Button className="danger">
                  {translateButton('delete')}
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>{translateStatus('inactive')}</TableCell>
              <TableCell>
                <Button className="secondary" style={{ marginRight: '5px' }}>
                  {translateButton('edit')}
                </Button>
                <Button className="danger">
                  {translateButton('delete')}
                </Button>
              </TableCell>
            </TableRow>
          </tbody>
        </Table>
      </Section>

      <Section>
        <SectionTitle>{translateSection('navigation')}</SectionTitle>
        <ButtonGroup>
          <Button className="secondary">{translateNavigation('dashboard')}</Button>
          <Button className="secondary">{translateNavigation('prompts')}</Button>
          <Button className="secondary">{translateNavigation('testSuites')}</Button>
          <Button className="secondary">{translateNavigation('results')}</Button>
        </ButtonGroup>
      </Section>

      <Section>
        <SectionTitle>{translateSection('common')}</SectionTitle>
        <p>{translateCommon('loading')}</p>
        <p>{translateCommon('success')}</p>
        <p>{translateCommon('error')}</p>
        <p>{translateCommon('warning')}</p>
        <p>{translateCommon('info')}</p>
      </Section>
    </ExampleContainer>
  );
};

export default TranslationExample;
