interface Props {
  onClose: () => void;
}

export default function Help({ onClose }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28, 31, 24, 0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--sage-200)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          maxWidth: 520,
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          padding: "28px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>How to Play</h2>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.85rem" }}
          >
            Close
          </button>
        </div>

        <Section title="Create a Game">
          <p>
            Tap <strong>New Game</strong> from the home screen. Choose whether
            you're watching a <strong>TV show</strong> or a{" "}
            <strong>YouTube channel</strong>.
          </p>
          <ul>
            <li>
              <strong>TV shows</strong> — start typing the name and pick from
              the suggestions.
            </li>
            <li>
              <strong>YouTube</strong> — search for a channel by name, or paste
              a channel or video URL. Recent videos are loaded automatically for
              transcript analysis.
            </li>
          </ul>
          <p>
            AI generates 24 bingo moments based on the show or channel's style
            and content. This takes a few seconds.
          </p>
        </Section>

        <Section title="Join a Game">
          <p>
            Open a game from the home screen or use a shared link. Enter your
            name and tap <strong>Join</strong>. Your name is remembered for next
            time.
          </p>
        </Section>

        <Section title="Play">
          <p>
            Once the host starts the game, everyone receives a unique 5&times;5
            bingo card. The centre square is a free space.
          </p>
          <p>
            While you watch together, tap squares as the moments happen.
            Squares are colour-coded by likelihood:
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
            <Chip bg="var(--easy)" label="Likely" />
            <Chip bg="var(--medium)" label="Possible" />
            <Chip bg="var(--hard)" label="Unlikely" />
          </div>
          <p>
            First player to complete a full row, column, or diagonal wins.
            Progress of all players is shown in the sidebar.
          </p>
        </Section>

        <Section title="Multiplayer">
          <p>
            Share the game link with friends — everyone joins the same game but
            gets a different card. The game updates in real time via WebSocket,
            so you can see each other's progress as you play.
          </p>
        </Section>

        <Section title="Tips" last>
          <ul>
            <li>3–5 YouTube videos give the best moment variety.</li>
            <li>Games with 2+ players are tracked on the leaderboard.</li>
            <li>You can rejoin a game by opening the same link again.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        paddingBottom: last ? 0 : 16,
        marginBottom: last ? 0 : 16,
        borderBottom: last ? "none" : "1px solid var(--sage-100)",
      }}
    >
      <h3
        style={{
          fontSize: "1rem",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color: "var(--sage-700)",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function Chip({ bg, label }: { bg: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "var(--radius)",
        background: bg,
        fontSize: "0.8rem",
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        color: "var(--sage-800)",
      }}
    >
      {label}
    </span>
  );
}
