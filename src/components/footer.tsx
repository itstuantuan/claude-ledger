import groups from './footer-links.json';
import socials from './social-links.json';
import { PrivacyChoices } from './privacy-choices';

const columns: (keyof typeof groups)[][] = [
  ['Products', 'Features', 'Models'],
  ['Solutions', 'Claude Platform'],
  ['Resources', 'Company'],
  ['Programs', 'Help and security', 'Terms and policies'],
];

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-inner">
      <a className="footer-brand" href="https://claude.com" target="_blank" rel="noreferrer" aria-label="Claude website"><img src="/logos/claude-wordmark.svg" width="112" height="24" alt="Claude" /></a>
      <nav className="footer-navigation" aria-label="Footer navigation">
        {columns.map((column, index) => <div className="footer-column" key={index}>
          {column.map(title => <section className="footer-group" key={title} aria-label={title}>
            <h2>{title}</h2>
            <ul>{groups[title].map(link => <li key={link.label}>{link.href
              ? <a href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
              : <PrivacyChoices />}</li>)}</ul>
          </section>)}
        </div>)}
      </nav>
      <div className="footer-bottom">
        <a href="https://www.anthropic.com" target="_blank" rel="noreferrer" aria-label="Anthropic website"><img className="anthropic-wordmark" src="/logos/anthropic-wordmark.svg" width="128" height="14" alt="Anthropic" /></a>
        <p>© 2026 ANTHROPIC PBC</p>
        <div className="social-links" aria-label="Social media">{socials.map(social => <a key={social.name} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}><img src={`/logos/${social.name}.svg`} width="16" height="16" alt="" /></a>)}</div>
      </div>
    </div>
  </footer>;
}
