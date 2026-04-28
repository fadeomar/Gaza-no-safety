import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameCanvas from "./components/GameCanvas";
import InGameHud from "./components/InGameHud";
import MobileControls from "./components/MobileControls";
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
  setAudioMuted,
  startAmbience,
  stopAmbience,
  unlockAudio,
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

const SOUND_MUTED_STORAGE_KEY = "run-to-safety-muted";

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
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SOUND_MUTED_STORAGE_KEY) === "true";
  });

  const keysRef = useRef<InputState>({ ...defaultInput });
  const gameRef = useRef(createLevelState(0));
  const lastRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastDamageSoundRef = useRef(0);
  const lastWarningRef = useRef(0);

  const copy = useMemo(() => t(language), [language]);
  const isArabic = language === "ar";

  const resetInput = useCallback(() => {
    keysRef.current = { ...defaultInput };
  }, []);

  const stopActiveGameplayAudio = useCallback(() => {
    stopAmbience();

    /*
      This is a defensive cleanup for long HTML audio elements, especially
      the long explosion file. It will not harm the game if there are no
      <audio> elements in the DOM.
    */
    if (typeof document !== "undefined") {
      document.querySelectorAll("audio").forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }, []);

  const refreshUi = useCallback(() => {
    setUi(createUiState(gameRef.current, TOTAL_LEVELS, copy));
    setFrame((value) => value + 1);
  }, [copy]);

  const toggleSound = useCallback(() => {
    unlockAudio();

    setIsMuted((value) => {
      const nextValue = !value;

      if (nextValue) {
        stopActiveGameplayAudio();
      }

      return nextValue;
    });
  }, [stopActiveGameplayAudio]);

  useEffect(() => {
    setUi(createUiState(gameRef.current, TOTAL_LEVELS, copy));
  }, [copy]);

  useEffect(() => {
    setAudioMuted(isMuted);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SOUND_MUTED_STORAGE_KEY, String(isMuted));
    }

    if (isMuted) {
      stopActiveGameplayAudio();
    }
  }, [isMuted, stopActiveGameplayAudio]);

  useEffect(() => {
    if (screen === "playing" && !isMuted) {
      startAmbience();
    } else {
      stopActiveGameplayAudio();
    }

    return () => {
      stopActiveGameplayAudio();
    };
  }, [screen, isMuted, stopActiveGameplayAudio]);

  useEffect(() => {
    if (screen === "briefing" && !isMuted) {
      playAlertSound();
    }
  }, [screen, isMuted]);

  const startGame = useCallback(() => {
    unlockAudio();
    stopActiveGameplayAudio();

    gameRef.current = createLevelState(0);
    resetInput();
    lastRef.current = 0;

    setUi(createDefaultUi(language));
    setFrame((value) => value + 1);
    setScreen("briefing");
  }, [language, resetInput, stopActiveGameplayAudio]);

  const launchCurrentLevel = useCallback(() => {
    unlockAudio();
    stopActiveGameplayAudio();

    resetInput();
    lastRef.current = 0;
    refreshUi();
    setScreen("playing");
  }, [refreshUi, resetInput, stopActiveGameplayAudio]);

  const restartLevel = useCallback(() => {
    unlockAudio();
    stopActiveGameplayAudio();

    const currentLevel = gameRef.current.levelIndex;
    gameRef.current = createLevelState(currentLevel);

    resetInput();
    lastRef.current = 0;
    refreshUi();
    setScreen("briefing");
  }, [refreshUi, resetInput, stopActiveGameplayAudio]);

  const nextLevel = useCallback(() => {
    unlockAudio();
    stopActiveGameplayAudio();

    const nextIndex = gameRef.current.levelIndex + 1;

    if (nextIndex >= TOTAL_LEVELS) {
      resetInput();
      setScreen("victory");
      return;
    }

    gameRef.current = createLevelState(nextIndex);

    resetInput();
    lastRef.current = 0;
    refreshUi();
    setScreen("briefing");
  }, [refreshUi, resetInput, stopActiveGameplayAudio]);

  const resumeGame = useCallback(() => {
    unlockAudio();

    resetInput();
    lastRef.current = 0;
    setScreen("playing");
  }, [resetInput]);

  const goToMenu = useCallback(() => {
    stopActiveGameplayAudio();

    resetInput();
    lastRef.current = 0;
    setScreen("menu");
  }, [resetInput, stopActiveGameplayAudio]);

  const pauseGame = useCallback(() => {
    stopActiveGameplayAudio();

    resetInput();
    lastRef.current = 0;
    setScreen("paused");
  }, [resetInput, stopActiveGameplayAudio]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          event.code,
        )
      ) {
        event.preventDefault();
      }

      if (
        screen === "briefing" &&
        (event.code === "Space" || event.code === "Enter")
      ) {
        launchCurrentLevel();
        return;
      }

      if (event.code === "KeyW" || event.code === "ArrowUp") {
        keysRef.current.up = true;
      }

      if (event.code === "KeyS" || event.code === "ArrowDown") {
        keysRef.current.down = true;
      }

      if (event.code === "KeyA" || event.code === "ArrowLeft") {
        keysRef.current.left = true;
      }

      if (event.code === "KeyD" || event.code === "ArrowRight") {
        keysRef.current.right = true;
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        keysRef.current.sprint = true;
      }

      if (event.code === "KeyR" && screen !== "menu") {
        restartLevel();
      }

      if (event.code === "Escape" && screen === "playing") {
        pauseGame();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyW" || event.code === "ArrowUp") {
        keysRef.current.up = false;
      }

      if (event.code === "KeyS" || event.code === "ArrowDown") {
        keysRef.current.down = false;
      }

      if (event.code === "KeyA" || event.code === "ArrowLeft") {
        keysRef.current.left = false;
      }

      if (event.code === "KeyD" || event.code === "ArrowRight") {
        keysRef.current.right = false;
      }

      if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
        keysRef.current.sprint = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [screen, launchCurrentLevel, pauseGame, restartLevel]);

  useEffect(() => {
    if (screen !== "playing") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      lastRef.current = 0;
      return;
    }

    const loop = (timestamp: number) => {
      if (!lastRef.current) {
        lastRef.current = timestamp;
      }

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

      /*
        Important:
        Handle terminal/intermission states BEFORE playing event sounds.
        This prevents a long explosion audio from starting on the same frame
        where the player reaches the safe zone.
      */
      if (result.dead) {
        stopActiveGameplayAudio();
        resetInput();
        setScreen("gameover");
        return;
      }

      if (result.reachedSafeZone) {
        stopActiveGameplayAudio();
        resetInput();

        if (!isMuted) {
          playSuccessSound();
        }

        if (result.finishedGame) {
          setScreen("victory");
          return;
        }

        setScreen("between-levels");
        return;
      }

      if (!isMuted) {
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

        if (result.playedExplosion) {
          playExplosionSound();
        }

        if (result.discoveredSafeZone) {
          playDiscoverySound();
        }

        if (result.lowHealthPulse) {
          playLowHealthPulse();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      lastRef.current = 0;
    };
  }, [screen, copy, isMuted, resetInput, stopActiveGameplayAudio]);

  return (
    <div
      className={`app-shell screen-${screen} ${
        screen === "playing" ? "is-playing" : ""
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header className="topbar compact-topbar">
        <div>
          {/* <span className="chip">{copy.appTag}</span> */}
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          <div className="controls-hint">
            <span className="desktop-controls-hint">
              {copy.controlsHintDesktop}
            </span>
            <span className="mobile-controls-hint">
              {copy.controlsHintMobile}
            </span>
          </div>
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

          <button className="language-button" onClick={toggleSound}>
            {isMuted ? copy.soundOff : copy.soundOn}
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

            {screen === "playing" ? (
              <MobileControls inputRef={keysRef} language={language} />
            ) : null}

            <Overlay
              language={language}
              screen={screen}
              onStart={startGame}
              onLaunch={launchCurrentLevel}
              onResume={resumeGame}
              onRestart={restartLevel}
              onNextLevel={nextLevel}
              onMenu={goToMenu}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
