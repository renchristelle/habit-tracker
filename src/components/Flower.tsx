import type { FlowerState } from '../lib/domain'

interface Props {
  state: FlowerState
  bloom: 'half' | 'full' | null
  color: string
  label: string
  size?: number
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Fleur aquarelle de la carte « Aujourd'hui » (à remplacer plus tard par des illustrations) */
export function Flower({ state, bloom, color, label, size = 56 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" role="img" aria-label={label}>
      {(state === 'bud' || state === 'rest') && (
        <g opacity={state === 'rest' ? 0.55 : 1}>
          <path d="M30 58 Q31 46 30 36" stroke="#6F8A6A" strokeWidth="1.6" fill="none" />
          <ellipse cx="24" cy="49" rx="6" ry="2.6" transform="rotate(-30 24 49)" fill="#8FA886" opacity="0.6" />
          <ellipse cx="30" cy="27" rx="7" ry="11" fill={color} opacity="0.5" />
          <ellipse cx="28" cy="29" rx="5" ry="9" transform="rotate(-12 28 29)" fill={color} opacity="0.45" />
        </g>
      )}
      {state === 'watered' && bloom === 'half' && (
        <g>
          {range(5).map((k) => (
            <ellipse key={k} cx="30" cy="19" rx="6.5" ry="11" transform={`rotate(${k * 72} 30 30)`} fill={color} opacity="0.5" />
          ))}
          <circle cx="30" cy="30" r="3.5" fill="#B8862F" opacity="0.75" />
        </g>
      )}
      {state === 'watered' && bloom === 'full' && (
        <g>
          {range(8).map((k) => (
            <ellipse key={k} cx="30" cy="14" rx="7.5" ry="13" transform={`rotate(${k * 45} 30 30)`} fill={color} opacity="0.4" />
          ))}
          {range(5).map((k) => (
            <ellipse key={'i' + k} cx="30" cy="21" rx="5" ry="8" transform={`rotate(${36 + k * 72} 30 30)`} fill={color} opacity="0.5" />
          ))}
          <circle cx="30" cy="30" r="4.5" fill="#B8862F" opacity="0.8" />
        </g>
      )}
      {state === 'watered' && (
        <g>
          <path d="M50 6 C47 11 46 13 46 15 A4 4 0 0 0 54 15 C54 13 53 11 50 6 Z" fill="#6E9CC4" opacity="0.8" />
          <path d="M8 40 C6 43 5.5 44.5 5.5 46 A2.6 2.6 0 0 0 10.7 46 C10.7 44.5 10 43 8 40 Z" fill="#6E9CC4" opacity="0.65" />
        </g>
      )}
      {state === 'dry' && (
        <g>
          <path d="M30 58 Q29 46 33 36" stroke="#B8A77E" strokeWidth="1.4" fill="none" />
          {range(5).map((k) => (
            <ellipse key={k} cx="34" cy="22" rx="5.5" ry="9" transform={`rotate(${10 + k * 72} 34 30)`} fill={color} opacity="0.22" />
          ))}
          <circle cx="34" cy="30" r="3" fill="#B8A77E" opacity="0.7" />
          <path d="M20 50 l3 -3 M40 52 l2 -4" stroke="#B8A77E" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}
      {state === 'wilted' && (
        <g>
          <path d="M26 58 Q26 40 36 32 Q44 27 46 36" stroke="#9A8A6A" strokeWidth="1.6" fill="none" />
          <ellipse cx="46" cy="42" rx="4.5" ry="8" transform="rotate(-10 46 42)" fill="#A58C74" opacity="0.5" />
          <ellipse cx="42" cy="42" rx="4" ry="7" transform="rotate(20 42 42)" fill="#A58C74" opacity="0.45" />
          <ellipse cx="50" cy="41" rx="3.5" ry="6.5" transform="rotate(-35 50 41)" fill="#A58C74" opacity="0.4" />
          <ellipse cx="14" cy="56" rx="4" ry="1.8" transform="rotate(15 14 56)" fill="#A58C74" opacity="0.45" />
          <ellipse cx="38" cy="57" rx="3.5" ry="1.6" transform="rotate(-10 38 57)" fill="#A58C74" opacity="0.4" />
        </g>
      )}
    </svg>
  )
}
