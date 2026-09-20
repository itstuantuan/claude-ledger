'use client';

import { useEffect, useState } from 'react';
import styles from './company-logos.module.css';

const brands = ['rakuten', 'notion', 'stubhub', 'cursor', 'intercom', 'replit', 'thomson-reuters', 'plaid', 'zapier', 'asana', 'ramp', 'uber', 'workato', 'databricks', 'stripe', 'brex', 'figma', 'shopify', 'pagerduty'];
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
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // Warm the local assets so an incoming logo never appears halfway through its animation.
    brands.forEach(brand => { const image = new Image(); image.src = `/logos/${brand}.svg`; });

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

  return <section className="companies" aria-label="Companies building with the Claude API">
    <p>Companies building with the Claude API</p>
    <div className="logo-row">
      {logos.map((logo, index) => <div className={`logo-slot ${styles.slot}`} style={{ animationDelay: `${index * 100}ms` }} key={index}>
        {outgoing?.slot === index && <span className={styles.outgoing} aria-hidden="true" key={`out-${outgoing.logo}`}><img src={`/logos/${outgoing.logo}.svg`} alt="" width="194" height="56" /></span>}
        <span className={outgoing?.slot === index ? styles.incoming : styles.logo} key={logo}><img src={`/logos/${logo}.svg`} alt={logo.replaceAll('-', ' ')} width="194" height="56" /></span>
      </div>)}
    </div>
  </section>;
}
