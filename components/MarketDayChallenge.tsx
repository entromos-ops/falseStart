"use client";

import { useEffect, useRef, useState } from "react";

type ChallengeEvent =
  | "challenge_started"
  | "first_response"
  | "hint_used"
  | "challenge_completed"
  | "challenge_feedback";

type MarketDayChallengeProps = {
  autoStart: boolean;
  shareNotice: string;
  onComplete: () => void;
  onSkip: () => void;
  onShare: () => void;
  onSpeak: (text: string) => void;
  onTrack: (
    event: ChallengeEvent,
    data?: Record<string, string | number | boolean | null>
  ) => void;
};

type ChallengeBeat = {
  id: string;
  label: string;
  rosa: string;
  question?: string;
  hint: string;
  correction: string;
  success: string;
  choices: Array<{ text: string; correct: boolean }>;
};

const MARKET_BEATS: ChallengeBeat[] = [
  {
    id: "greet",
    label: "Greet the vendor",
    rosa: "¡Buenos días! ¿Cómo estás?",
    hint: "She asked how you are.",
    correction: "Answer how you feel: Muy bien, gracias.",
    success: "¡Me alegro!",
    choices: [
      { text: "Muy bien, gracias.", correct: true },
      { text: "Buenos días.", correct: false },
      { text: "Me gustaría pan.", correct: false }
    ]
  },
  {
    id: "request",
    label: "Ask politely",
    rosa: "¿Qué te gustaría?",
    hint: "Quisiera… is a polite way to say ‘I would like…’",
    correction: "Use Quisiera to politely ask for the bread.",
    success: "Claro.",
    choices: [
      { text: "Quisiera pan, por favor.", correct: true },
      { text: "Quiero pagar, por favor.", correct: false },
      { text: "¿Cuánto pan?", correct: false }
    ]
  },
  {
    id: "price",
    label: "Understand the price",
    rosa: "El pan cuesta tres monedas.",
    question: "¿Cuánto cuesta?",
    hint: "Listen for tres—three.",
    correction: "Rosa said tres monedas: three coins.",
    success: "Exactamente: tres monedas.",
    choices: [
      { text: "Una moneda.", correct: false },
      { text: "Tres monedas.", correct: true },
      { text: "Cinco monedas.", correct: false }
    ]
  },
  {
    id: "quantity",
    label: "Choose a quantity",
    rosa: "¿Cuántos quieres?",
    hint: "She asked how many you want.",
    correction: "Answer with the quantity: Quiero uno, por favor.",
    success: "Un pan. Perfecto.",
    choices: [
      { text: "Quiero uno, por favor.", correct: true },
      { text: "Cuesta uno, por favor.", correct: false },
      { text: "Tengo una moneda.", correct: false }
    ]
  },
  {
    id: "finish",
    label: "Finish naturally",
    rosa: "Aquí tienes. ¿Algo más?",
    hint: "Say: ‘No thanks. That’s all.’",
    correction: "Finish politely with No, gracias. Eso es todo.",
    success: "¡Gracias! Que tengas un buen día.",
    choices: [
      { text: "No, gracias. Eso es todo.", correct: true },
      { text: "Sí, cuesta tres.", correct: false },
      { text: "No sé dónde está.", correct: false }
    ]
  }
];

export default function MarketDayChallenge({
  autoStart,
  shareNotice,
  onComplete,
  onSkip,
  onShare,
  onSpeak,
  onTrack
}: MarketDayChallengeProps) {
  const [phase, setPhase] = useState<"landing" | "playing" | "result">("landing");
  const [beatIndex, setBeatIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [usefulVote, setUsefulVote] = useState<"yes" | "not-yet" | null>(null);
  const autoStartedRef = useRef(false);
  const firstResponseRef = useRef(false);

  function startChallenge(source: "landing" | "shared_link") {
    setPhase("playing");
    setBeatIndex(0);
    setHintVisible(false);
    setFeedback(null);
    onTrack("challenge_started", { source });
  }

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startChallenge("shared_link");
  // Deliberately run only when the shared-link signal first arrives.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const beat = MARKET_BEATS[beatIndex];

  function choose(correct: boolean) {
    if (feedback === "correct") return;
    if (!firstResponseRef.current) {
      firstResponseRef.current = true;
      onTrack("first_response", { beat: beat.id });
    }
    if (!correct) {
      setWrongAttempts((value) => value + 1);
      setFeedback("wrong");
      return;
    }
    setFeedback("correct");
  }

  function continueChallenge() {
    if (beatIndex >= MARKET_BEATS.length - 1) {
      setPhase("result");
      onTrack("challenge_completed", {
        wrong_attempts: wrongAttempts,
        hints_used: hintsUsed
      });
      return;
    }
    setBeatIndex((value) => value + 1);
    setHintVisible(false);
    setFeedback(null);
  }

  function revealHint() {
    if (!hintVisible) {
      setHintsUsed((value) => value + 1);
      onTrack("hint_used", { beat: beat.id });
    }
    setHintVisible(true);
  }

  function submitVote(vote: "yes" | "not-yet") {
    setUsefulVote(vote);
    onTrack("challenge_feedback", { useful: vote === "yes" });
  }

  return (
    <main className="realm-intro">
      <div className="intro-sun" aria-hidden="true" />
      <div className="intro-landscape" aria-hidden="true">
        <span className="intro-mountain intro-mountain--one" />
        <span className="intro-mountain intro-mountain--two" />
        <span className="intro-house" />
        <span className="intro-tree intro-tree--one" />
        <span className="intro-tree intro-tree--two" />
      </div>

      <section className={`market-card market-card--${phase}`} aria-live="polite">
        <header className="market-brand-row">
          <div className="intro-brand"><span>L</span> LUMA VILLAGE</div>
          <span className="market-free-tag">FREE FIRST CHAPTER</span>
        </header>

        {phase === "landing" ? (
          <div className="market-landing">
            <p className="intro-kicker">Your first real-world win</p>
            <h1>Buy breakfast<br />in Spanish.</h1>
            <p className="intro-copy">
              Try a 60-second market conversation, then step into a cozy world
              where Spanish helps you farm, trade, cook, and explore.
            </p>
            <button
              className="intro-enter"
              type="button"
              onClick={() => startChallenge("landing")}
            >
              <span>Try Market Day</span><b aria-hidden="true">→</b>
            </button>
            <div className="market-promise" aria-label="What to expect">
              <span><b>5</b> tiny choices</span>
              <span><b>60</b> seconds</span>
              <span><b>1</b> useful win</span>
            </div>
            <button className="market-text-button" type="button" onClick={onSkip}>
              I already know the basics — enter the valley
            </button>
            <p className="intro-save-note">No ads · No account · No streak pressure</p>
          </div>
        ) : null}

        {phase === "playing" ? (
          <div className="market-playing">
            <div className="market-progress-row">
              <span>Market Day</span>
              <strong>{beatIndex + 1} / {MARKET_BEATS.length}</strong>
            </div>
            <div className="market-progress-track" aria-hidden="true">
              <i style={{ width: `${((beatIndex + 1) / MARKET_BEATS.length) * 100}%` }} />
            </div>
            <p className="market-beat-label">{beat.label}</p>

            <div className="market-speaker">
              <span className="market-portrait" aria-hidden="true">R</span>
              <div>
                <small>ROSA · LA COMERCIANTE</small>
                <p lang="es-MX">{beat.rosa}</p>
                {beat.question ? <strong lang="es-MX">{beat.question}</strong> : null}
              </div>
              <button
                type="button"
                className="market-listen"
                onClick={() => onSpeak(`${beat.rosa} ${beat.question ?? ""}`)}
                aria-label="Listen to Rosa"
              >
                <span aria-hidden="true">◖))</span>
              </button>
            </div>

            <button className="market-hint-button" type="button" onClick={revealHint}>
              {hintVisible ? beat.hint : "Need an English hint?"}
            </button>

            <div className="market-choices" aria-label="Choose your response">
              {beat.choices.map((choice) => (
                <button
                  type="button"
                  key={choice.text}
                  disabled={feedback === "correct"}
                  className={feedback === "correct" && choice.correct ? "is-correct" : ""}
                  onClick={() => choose(choice.correct)}
                  lang="es-MX"
                >
                  <span>{choice.text}</span><i aria-hidden="true">›</i>
                </button>
              ))}
            </div>

            {feedback ? (
              <div className={`market-feedback market-feedback--${feedback}`} role="status">
                <strong>{feedback === "correct" ? beat.success : "Not quite—try again."}</strong>
                {feedback === "wrong" ? <span>{beat.correction}</span> : null}
              </div>
            ) : null}

            {feedback === "correct" ? (
              <button className="market-continue" type="button" onClick={continueChallenge}>
                {beatIndex === MARKET_BEATS.length - 1 ? "See what you can do" : "Continue"}
                <span aria-hidden="true">→</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {phase === "result" ? (
          <div className="market-result">
            <span className="market-result-seal" aria-hidden="true">✓</span>
            <p className="intro-kicker">First real-world win</p>
            <h1>You bought bread<br />in Spanish.</h1>
            <p className="intro-copy">
              You greeted Rosa, asked politely, understood the price, chose a
              quantity, and ended the conversation naturally.
            </p>
            <div className="market-capability">
              <small>MY SPANISH PASSPORT</small>
              <strong>I can buy a simple item at a market.</strong>
              <span>Pan bought · waiting in your backpack</span>
            </div>
            <button className="intro-enter" type="button" onClick={onComplete}>
              <span>Keep living in Luma</span><b aria-hidden="true">→</b>
            </button>
            <button className="market-share-button" type="button" onClick={onShare}>
              Challenge a friend
            </button>
            {shareNotice ? <p className="market-share-notice" role="status">{shareNotice}</p> : null}
            <div className="market-useful-vote">
              <span>{usefulVote ? "Thanks — that helps shape the next chapter." : "Did this feel useful?"}</span>
              {!usefulVote ? (
                <div>
                  <button type="button" onClick={() => submitVote("yes")}>Yes</button>
                  <button type="button" onClick={() => submitVote("not-yet")}>Not yet</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
