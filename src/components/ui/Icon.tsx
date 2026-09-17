import type { SVGProps } from 'react'

const paths = {
  institution: 'm3 8 9-5 9 5H3Zm3 4v7m6-7v7m6-7v7M3 22h18',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  people:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  book: 'M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V6Z',
  building: 'M4 22V3h12v19M8 7h4M8 11h4M8 15h4m4-4h4v11M2 22h20M8 22v-3h4v3',
  calendar:
    'M8 2v4m8-4v4M3 10h18M4 4h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm3 10h3m4 0h3m-10 4h3',
  clipboard:
    'M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 2h6v4H9V2Zm-1 12 3 3 5-6',
  shield: 'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Zm-4 9 3 3 5-6',
  wallet: 'M20 8V4H5a3 3 0 0 0 0 6h16v11H5a3 3 0 0 1-3-3V7m19 7h-5v4h5',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'm6 6 12 12M6 18 18 6',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  folder: 'M3 7V4h6l3 3h9v14H3V7Zm5 7h8',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  className = 'size-5',
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}
