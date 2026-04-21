import { TOTAL_LEVELS } from '../game/constants';
import { t } from '../game/i18n';
import type { Language, UiState } from '../game/types';

type Props = {
  language: Language;
  ui: UiState;
};

export default function InGameHud({ language, ui }: Props) {
  const copy = t(language);

  return (
    <>
      <div className="hud-panel hud-top-left">
        <div className="hud-row">
          <span>{copy.health}</span>
          <strong>{Math.max(0, ui.health).toFixed(0)}%</strong>
        </div>
        <div className="hud-track danger"><div className="hud-fill" style={{ width: `${Math.max(0, ui.health)}%` }} /></div>

        <div className="hud-row mt-12">
          <span>{copy.stamina}</span>
          <strong>{Math.max(0, ui.stamina).toFixed(0)}%</strong>
        </div>
        <div className="hud-track"><div className="hud-fill green" style={{ width: `${Math.max(0, ui.stamina)}%` }} /></div>
      </div>

      <div className="hud-panel hud-top-right">
        <div className="hud-meta-label">{copy.level}</div>
        <div className="hud-meta-value">{ui.levelNumber} / {TOTAL_LEVELS}</div>
        <div className="hud-meta-label mt-12">{copy.timeAlive}</div>
        <div className="hud-meta-value">{ui.timeAlive.toFixed(1)}s</div>
      </div>

      <div className="hud-objective">
        <div className="hud-objective-title">{ui.levelName}</div>
        <div className="hud-objective-body">{ui.objective}</div>
      </div>
    </>
  );
}
