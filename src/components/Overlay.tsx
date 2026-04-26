import { t } from '../game/i18n';
import type { Language, ScreenState } from '../game/types';

type Props = {
  language: Language;
  screen: ScreenState;
  onStart: () => void;
  onLaunch: () => void;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onMenu: () => void;
};

export default function Overlay({ language, screen, onStart, onLaunch, onResume, onRestart, onNextLevel, onMenu }: Props) {
  if (screen === 'playing') return null;
  const copy = t(language);

  let title = copy.menuTitle;
  let body = copy.menuBody;
  let primaryLabel = copy.startMission;
  let primaryAction = onStart;
  let secondaryLabel: string | null = null;
  let secondaryAction: (() => void) | null = null;
  let accent = copy.appTag;

  if (screen === 'briefing') {
    title = copy.briefingTitle;
    body = copy.briefingBody;
    primaryLabel = copy.alertPrimary;
    primaryAction = onLaunch;
    secondaryLabel = copy.mainMenu;
    secondaryAction = onMenu;
    accent = copy.alertLabel;
  }

  if (screen === 'paused') {
    title = copy.pausedTitle;
    body = copy.pausedBody;
    primaryLabel = copy.resume;
    primaryAction = onResume;
    secondaryLabel = copy.restart;
    secondaryAction = onRestart;
  }

  if (screen === 'between-levels') {
    title = copy.betweenTitle;
    body = copy.betweenBody;
    primaryLabel = copy.nextLevel;
    primaryAction = onNextLevel;
    secondaryLabel = copy.restart;
    secondaryAction = onRestart;
  }

  if (screen === 'gameover') {
    title = copy.gameOverTitle;
    body = copy.gameOverBody;
    primaryLabel = copy.restart;
    primaryAction = onRestart;
    secondaryLabel = copy.mainMenu;
    secondaryAction = onMenu;
  }

  if (screen === 'victory') {
    title = copy.victoryTitle;
    body = copy.victoryBody;
    primaryLabel = copy.startMission;
    primaryAction = onStart;
    secondaryLabel = copy.mainMenu;
    secondaryAction = onMenu;
  }

  return (
    <div className="overlay">
      <div className={`overlay-card ${screen === 'briefing' ? 'overlay-alert' : ''}`}>
        <div className="overlay-badge">{accent}</div>
        {screen === 'briefing' ? <div className="overlay-sub-badge">{copy.alertSubLabel}</div> : null}
        <h2>{title}</h2>
        <p>{body}</p>
        {screen === 'briefing' ? <div className="overlay-keyhint">Enter / Space</div> : null}
        <div className="overlay-actions">
          <button className="primary" onClick={primaryAction}>{primaryLabel}</button>
          {secondaryLabel && secondaryAction ? <button onClick={secondaryAction}>{secondaryLabel}</button> : null}
        </div>
      </div>
    </div>
  );
}
