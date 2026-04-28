import { useRef, useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";
import { t } from "../game/i18n";
import type { InputState, Language } from "../game/types";

type InputKey = keyof InputState;

type Props = {
  inputRef: MutableRefObject<InputState>;
  language: Language;
};

type ControlButtonProps = {
  inputRef: MutableRefObject<InputState>;
  inputKey: InputKey;
  label: string;
  className?: string;
};

function setInput(inputRef: MutableRefObject<InputState>, key: InputKey, value: boolean) {
  inputRef.current[key] = value;
}

function ControlButton({ inputRef, inputKey, label, className = "" }: ControlButtonProps) {
  const activePointersRef = useRef<Set<number>>(new Set());
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    activePointersRef.current.add(event.pointerId);
    event.currentTarget.dataset.pressed = "true";
    setIsPressed(true);
    setInput(inputRef, inputKey, true);
  };

  const handleRelease = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    activePointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (activePointersRef.current.size > 0) return;
    delete event.currentTarget.dataset.pressed;
    setIsPressed(false);
    setInput(inputRef, inputKey, false);
  };

  return (
    <button
      type="button"
      className={`mobile-control-button ${className}`}
      aria-label={label}
      onPointerDown={handlePress}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onLostPointerCapture={handleRelease}
      onContextMenu={(event) => event.preventDefault()}
      data-active={isPressed ? "true" : undefined}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

export default function MobileControls({ inputRef, language }: Props) {
  const copy = t(language);

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div className="mobile-run-hint">{copy.controlsHintMobile}</div>
      <div className="mobile-dpad">
        <ControlButton inputRef={inputRef} inputKey="up" label="Up" className="mobile-dpad-up" />
        <ControlButton inputRef={inputRef} inputKey="left" label="Left" className="mobile-dpad-left" />
        <ControlButton inputRef={inputRef} inputKey="right" label="Right" className="mobile-dpad-right" />
        <ControlButton inputRef={inputRef} inputKey="down" label="Down" className="mobile-dpad-down" />
      </div>
      <ControlButton inputRef={inputRef} inputKey="sprint" label="Sprint" className="mobile-sprint-button" />
    </div>
  );
}
