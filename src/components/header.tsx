'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  ['Developer Docs', 'https://platform.claude.com/docs'],
  ['API Reference', 'https://platform.claude.com/docs/en/api/overview'],
  ['Cookbooks', 'https://platform.claude.com/cookbook/'],
  ['Quickstart', 'https://platform.claude.com/docs/en/get-started'],
];

export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="relative z-20 h-[84px] border-b border-black/10 bg-[#fcfcfb] max-[767px]:h-[72px]" onKeyDown={(event) => {
    if (event.key === 'Escape') setOpen(false);
  }}>
    <div className="mx-auto flex h-full w-[calc(100%-64px)] max-w-[1440px] items-center justify-between gap-6 max-[767px]:w-[calc(100%-40px)]">
      <Link className="whitespace-nowrap font-serif text-2xl font-medium tracking-[-.65px] max-[767px]:text-[22px]" href="/" aria-label="Ledger Console home">Ledger Console</Link>
      <nav className="flex items-center gap-12 text-sm max-[1103px]:gap-6 max-[767px]:hidden" aria-label="Main navigation">
        {links.map(([label, url]) => <a className="transition-colors hover:text-[#77756e]" key={label} href={url} target="_blank" rel="noreferrer">{label}</a>)}
        <a className="ml-[-12px] rounded-lg border border-black/15 px-[11px] py-[7px] leading-[18px] shadow-[0_1px_2px_#0000000d] transition-colors hover:bg-[#f0efec]" href="https://claude.com/contact-sales" target="_blank" rel="noreferrer">Contact sales</a>
      </nav>
      <button className="hidden size-9 place-items-center rounded-lg border border-black/15 bg-transparent max-[767px]:grid" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="mobile-nav">
        <span className={`relative block h-px w-4 bg-black transition-transform after:absolute after:left-0 after:top-1.5 after:block after:h-px after:w-4 after:bg-black after:content-[''] ${open ? 'rotate-45 after:top-0 after:-rotate-90' : '-translate-y-[3px]'}`} />
      </button>
    </div>
    {open && <nav id="mobile-nav" className="absolute left-0 right-0 top-[72px] bg-[#fcfcfb] px-6 pb-6 pt-3 shadow-[0_8px_12px_#00000009] min-[768px]:hidden" aria-label="Mobile navigation">
      {[...links, ['Contact sales', 'https://claude.com/contact-sales']].map(([label, url]) => <a className="flex justify-between py-3.5 text-[15px]" key={label} href={url} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>{label}<span aria-hidden="true">↗</span></a>)}
    </nav>}
  </header>;
}
