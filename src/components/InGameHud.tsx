import { TOTAL_LEVELS } from '../game/constants';
import { t } from '../game/i18n';
import type { Language, UiState } from '../game/types';

type Props = {
  language: Language;
  ui: UiState;
};

export default function InGameHud({ language, ui }: Props) {
  const copy = t(language);
  const dangerLabel = ui.dangerLevel === 'high' ? copy.dangerHigh : ui.dangerLevel === 'medium' ? copy.dangerMedium : copy.dangerLow;
  const health = Math.min(100, Math.max(0, ui.health));
  const stamina = Math.min(100, Math.max(0, ui.stamina));
  const breathStatus = stamina <= 0 ? copy.outOfBreath : ui.status === copy.statusSprint ? copy.running : null;

  return (
    <>
      <div className="hud-panel hud-top-left">
        <div className="hud-row hud-strong-row">
          <span>{copy.health}</span>
          <strong>{health.toFixed(0)}%</strong>
        </div>
        <div className="hud-track danger"><div className="hud-fill" style={{ width: `${health}%` }} /></div>

        <div className="hud-row mt-12 hud-sub-row">
          <span>{copy.stamina}</span>
          <strong>{stamina.toFixed(0)}%</strong>
        </div>
        <div className="hud-track"><div className="hud-fill green" style={{ width: `${stamina}%` }} /></div>
        {breathStatus ? <div className="hud-breath-status">{breathStatus}</div> : null}
      </div>

      <div className="hud-panel hud-top-right">
        <div className="hud-meta-grid">
          <div>
            <div className="hud-meta-label">{copy.level}</div>
            <div className="hud-meta-value">{ui.levelNumber} / {TOTAL_LEVELS}</div>
          </div>
          <div>
            <div className="hud-meta-label">{copy.nextStrike}</div>
            <div className="hud-meta-value">{ui.nextStrike.toFixed(1)}s</div>
          </div>
        </div>
        <div className="hud-meta-label mt-12">{copy.dangerLevel}</div>
        <div className={`hud-meta-chip danger-${ui.dangerLevel}`}>{dangerLabel}</div>
      </div>

      <div className="hud-objective">
        <div className="hud-objective-title">{ui.levelName}</div>
        <div className="hud-objective-body">{ui.objective}</div>
        <div className="hud-objective-status">{ui.status}</div>
      </div>
    </>
  );
}
