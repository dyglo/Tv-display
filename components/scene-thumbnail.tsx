import type { SceneId } from "../lib/environment";
export default function SceneThumbnail({ scene }: { scene: SceneId }) {
  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-${scene}`} x2="0" y2="1">
          <stop stopColor={scene === "galaxy" ? "#090e21" : "#71979a"} />
          <stop
            offset="1"
            stopColor={scene === "galaxy" ? "#302740" : "#d7ceab"}
          />
        </linearGradient>
        <linearGradient id={`water-${scene}`} x2="0" y2="1">
          <stop stopColor="#9daf9c" />
          <stop offset="1" stopColor="#425f59" />
        </linearGradient>
      </defs>
      <path fill={`url(#sky-${scene})`} d="M0 0h400v200H0z" />
      {scene === "galaxy" ? (
        <>
          <ellipse
            cx="150"
            cy="90"
            rx="155"
            ry="30"
            fill="#535377"
            opacity=".25"
            transform="rotate(-25 150 90)"
          />
          {Array.from({ length: 65 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 137.5) % 400}
              cy={(i * 73.3) % 200}
              r={i % 5 === 0 ? 1.4 : 0.7}
              fill="#dae3e6"
              opacity={0.3 + (i % 5) * 0.13}
            />
          ))}
          <circle cx="287" cy="84" r="48" fill="#9c8b77" />
          <path
            d="M255 58q32 16 64 0M243 83q44 18 90 0M253 109q30 12 64 0"
            stroke="#645a56"
            strokeWidth="8"
            opacity=".4"
          />
          <ellipse
            cx="287"
            cy="84"
            rx="80"
            ry="19"
            stroke="#baa994"
            strokeWidth="9"
            fill="none"
            transform="rotate(-20 287 84)"
            opacity=".7"
          />
        </>
      ) : (
        <>
          <path
            d="M0 100L55 43l52 38 46-53 70 67 53-65 75 75 49-30v125H0z"
            fill="#7a9185"
          />
          <path
            d="M0 115L73 84l64 33 92-56 70 48 63-29 38 34v86H0z"
            fill="#526e61"
          />
          <path d="M0 130h400v70H0z" fill={`url(#water-${scene})`} />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${80 + (i % 3) * 20} ${135 + i * 6}h${160 - i * 5}`}
              stroke="#d1d6bc"
              opacity=".15"
            />
          ))}
          {[15, 44, 350, 378].map((x, i) => (
            <path
              key={x}
              d={`M${x} 130l-22 0 12-22h-7l14-23h-7l10-29 11 29h-7l14 23h-7l12 22z`}
              fill={i % 2 ? "#2e493e" : "#3d5947"}
            />
          ))}
          {scene === "room" && (
            <>
              <path
                d="M0 0h400v18H0zM0 0h30v200H0zM370 0h30v200h-30zM0 162h400v38H0z"
                fill="#a99b80"
              />
              <path d="M126 16h5v148h-5zM267 16h5v148h-5z" fill="#43483c" />
              <path d="M245 152h115v43H245z" fill="#c5bca5" />
              <path d="M250 151h106v20H250z" fill="#d6cbb3" />
              <ellipse cx="183" cy="183" rx="46" ry="9" fill="#796145" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
