'use client';

import { useEffect, useState } from 'react';
import styles from './company-logos.module.css';

const brands = ['replit', 'intercom', 'plaid', 'zapier', 'thomson-reuters', 'asana', 'rakuten', 'notion', 'stubhub', 'cursor', 'ramp', 'uber', 'workato', 'databricks', 'stripe', 'brex', 'figma', 'shopify', 'pagerduty'];
const initial = brands.slice(0, 6);

export function CompanyLogos() {
  const [logos, setLogos] = useState(initial);
  const [outgoing, setOutgoing] = useState<{ slot: number; logo: string } | null>(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let current = [...initial];
    let slotCursor = 0;
    let poolCursor = 6;
    let start: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    let fade: ReturnType<typeof setTimeout> | undefined;
    const order = [0, 1, 2, 3, 4, 5];
    brands.forEach((brand) => { const image = new Image(); image.src = `/logos/${brand}.svg`; });

    function stop() { clearTimeout(start); clearInterval(interval); clearTimeout(fade); }
    function rotate() {
      if (document.hidden || motion.matches) return;
      const slot = order[slotCursor++ % order.length];
      while (current.includes(brands[poolCursor % brands.length])) poolCursor++;
      const next = brands[poolCursor++ % brands.length];
      setOutgoing({ slot, logo: current[slot] });
      current = current.map((logo, index) => index === slot ? next : logo);
      setLogos(current);
      fade = setTimeout(() => setOutgoing(null), 1000);
    }
    function startMotion() {
      stop();
      setOutgoing(null);
      if (motion.matches) return;
      start = setTimeout(() => { rotate(); interval = setInterval(rotate, 1500); }, 2850);
    }
    startMotion();
    motion.addEventListener('change', startMotion);
    return () => { stop(); motion.removeEventListener('change', startMotion); };
  }, []);

  return <section className="mx-auto flex w-[calc(100%-64px)] max-w-[1440px] flex-col items-center gap-6 py-12 max-[767px]:w-[calc(100%-32px)] max-[767px]:py-9" aria-label="Companies building with the Claude API">
    <p className="font-serif text-base">Companies building with the Claude API</p>
    <div className="flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-4 max-[1103px]:justify-center">
      {logos.map((logo, index) => <div className={`grid h-14 w-[194px] place-items-center overflow-hidden max-[767px]:h-12 max-[767px]:w-[156px] ${styles.slot}`} style={{ animationDelay: `${index * 100}ms` }} key={index}>
        {outgoing?.slot === index && <span className={styles.outgoing} aria-hidden="true" key={`out-${outgoing.logo}`}><img className="h-14 w-[194px] object-contain max-[767px]:h-12 max-[767px]:w-[156px]" src={`/logos/${outgoing.logo}.svg`} alt="" width="194" height="56" /></span>}
        <span className={outgoing?.slot === index ? styles.incoming : styles.logo} key={logo}><img className="h-14 w-[194px] object-contain max-[767px]:h-12 max-[767px]:w-[156px]" src={`/logos/${logo}.svg`} alt={logo.replaceAll('-', ' ')} width="194" height="56" /></span>
      </div>)}
    </div>
  </section>;
}
