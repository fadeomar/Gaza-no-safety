import { useEffect, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import InGameHud from "./components/InGameHud";
import Overlay from "./components/Overlay";
import { TOTAL_LEVELS } from "./game/constants";
import {
  playAlertSound,
  playDamageSound,
  playDiscoverySound,
  playExplosionSound,
  playLowHealthPulse,
  playStrikeWarningSound,
  playSuccessSound,
  startAmbience,
  stopAmbience,
} from "./game/audio";
import { createUiState, updateGame } from "./game/engine";
import { createLevelState } from "./game/initialState";
import { t } from "./game/i18n";
import type { InputState, Language, ScreenState, UiState } from "./game/types";

const defaultInput: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  sprint: false,
};

function createDefaultUi(language: Language): UiState {
  const copy = t(language);
  return {
    levelName: copy.levelNames[0],
    levelNumber: 1,
    health: 100,
    stamina: 100,
    timeAlive: 0,
    objective: copy.objectiveSearch,
    status: copy.statusScanning,
    progress: 0,
    nextStrike: 4.2,
    dangerLevel: "low",
  };
}

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [screen, setScreen] = useState<ScreenState>("menu");
  const [ui, setUi] = useState<UiState>(createDefaultUi("en"));
  const [frame, setFrame] = useState(0);

  const keysRef = useRef<InputState>({ ...defaultInput });
  const gameRef = useRef(createLevelState(0));
  const lastRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDamageSoundRef = useRef(0);
  const lastWarningRef = useRef(0);

  const copy = t(language);
  const isArabic = language === "ar";

  const refreshUi = () => {
    setUi(createUiState(gameRef.current, TOTAL_LEVELS, copy));
    setFrame((value) => value + 1);
  };

  useEffect(() => {
    setUi(createUiState(gameRef.current, TOTAL_LEVELS, copy));
  }, [language]);

  useEffect(() => {
    if (screen === "playing" || screen === "briefing") startAmbience();
    else stopAmbience();
    return () => stopAmbience();
  }, [screen]);

  useEffect(() => {
    if (screen === "briefing") playAlertSound();
  }, [screen]);

  const startGame = () => {
    gameRef.current = createLevelState(0);
    keysRef.current = { ...defaultInput };
    lastRef.current = 0;
    setUi(createDefaultUi(language));
    setFrame((value) => value + 1);
    setScreen("briefing");
  };

  const launchCurrentLevel = () => {
    keysRef.current = { ...defaultInput };
    lastRef.current = 0;
    refreshUi();
    setScreen("playing");
  };

  const restartLevel = () => {
    const currentLevel = gameRef.current.levelIndex;
    gameRef.current = createLevelState(currentLevel);
    keysRef.current = { ...defaultInput };
    lastRef.current = 0;
    refreshUi();
    setScreen("briefing");
  };

  const nextLevel = () => {
    const nextIndex = gameRef.current.levelIndex + 1;
    if (nextIndex >= TOTAL_LEVELS) {
      setScreen("victory");
      return;
    }
    gameRef.current = createLevelState(nextIndex);
    keysRef.current = { ...defaultInput };
    lastRef.current = 0;
    refreshUi();
    setScreen("briefing");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          event.code,
        )
      )
        event.preventDefault();
      if (
        screen === "briefing" &&
        (event.code === "Space" || event.code === "Enter")
      ) {
        launchCurrentLevel();
        return;
      }
      if (event.code === "KeyW" || event.code === "ArrowUp")
        keysRef.current.up = true;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        keysRef.current.down = true;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        keysRef.current.left = true;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        keysRef.current.right = true;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight")
        keysRef.current.sprint = true;
      if (event.code === "KeyR" && screen !== "menu") restartLevel();
      if (event.code === "Escape" && screen === "playing") setScreen("paused");
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyW" || event.code === "ArrowUp")
        keysRef.current.up = false;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        keysRef.current.down = false;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        keysRef.current.left = false;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        keysRef.current.right = false;
      if (event.code === "ShiftLeft" || event.code === "ShiftRight")
        keysRef.current.sprint = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const loop = (timestamp: number) => {
      if (!lastRef.current) lastRef.current = timestamp;
      const dt = Math.min((timestamp - lastRef.current) / 1000, 0.033);
      lastRef.current = timestamp;

      const result = updateGame(
        gameRef.current,
        keysRef.current,
        TOTAL_LEVELS,
        copy,
        dt,
      );
      setUi(result.uiState);
      setFrame((value) => value + 1);

      if (result.tookDamage && timestamp - lastDamageSoundRef.current > 180) {
        playDamageSound();
        lastDamageSoundRef.current = timestamp;
      }
      if (
        result.playedStrikeWarning &&
        timestamp - lastWarningRef.current > 120
      ) {
        playStrikeWarningSound();
        lastWarningRef.current = timestamp;
      }
      if (result.playedExplosion) playExplosionSound();
      if (result.discoveredSafeZone) playDiscoverySound();
      if (result.reachedSafeZone) playSuccessSound();
      if (result.lowHealthPulse) playLowHealthPulse();

      if (result.dead) {
        setScreen("gameover");
        return;
      }
      if (result.reachedSafeZone && result.finishedGame) {
        setScreen("victory");
        return;
      }
      if (result.reachedSafeZone) {
        setScreen("between-levels");
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastRef.current = 0;
    };
  }, [screen, language]);

  return (
    <div className="app-shell" dir={isArabic ? "rtl" : "ltr"}>
      <header className="topbar compact-topbar">
        <div>
          {/* <span className="chip">{copy.appTag}</span> */}
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="topbar-actions">
          <button
            className="ghost-button"
            onClick={screen === "menu" ? startGame : restartLevel}
          >
            {screen === "menu" ? copy.startMission : copy.restart}
          </button>
          <button
            className="language-button"
            onClick={() => setLanguage(isArabic ? "en" : "ar")}
          >
            {copy.toggleLanguage}
          </button>
        </div>
      </header>

      <main className="game-layout single-column-layout">
        <section className="game-stage card">
          <div className="game-stage-frame">
            <GameCanvas
              frame={frame}
              state={gameRef.current}
              language={language}
            />
            <InGameHud language={language} ui={ui} />
            <Overlay
              language={language}
              screen={screen}
              onStart={startGame}
              onLaunch={launchCurrentLevel}
              onResume={() => setScreen("playing")}
              onRestart={restartLevel}
              onNextLevel={nextLevel}
              onMenu={() => setScreen("menu")}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
