import { t } from '../game/i18n';
import type { Language, ScreenState } from '../game/types';

type Props = {
  language: Language;
  screen: ScreenState;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onMenu: () => void;
};

export default function Overlay({ language, screen, onStart, onResume, onRestart, onNextLevel, onMenu }: Props) {
  if (screen === 'playing') return null;
  const copy = t(language);

  let title = copy.menuTitle;
  let body = copy.menuBody;
  let primaryLabel = copy.startMission;
  let primaryAction = onStart;
  let secondaryLabel: string | null = null;
  let secondaryAction: (() => void) | null = null;

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
      <div className="overlay-card">
        <div className="overlay-badge">{copy.appTag}</div>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="overlay-actions">
          <button className="primary" onClick={primaryAction}>{primaryLabel}</button>
          {secondaryLabel && secondaryAction ? <button onClick={secondaryAction}>{secondaryLabel}</button> : null}
        </div>
      </div>
    </div>
  );
}
