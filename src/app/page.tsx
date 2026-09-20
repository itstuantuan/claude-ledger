import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { LoginForm } from '@/components/login-form';
import { CompanyLogos } from '@/components/company-logos';
import { DotField } from '@/components/dot-field';
export default function Home() {
  return <><Header /><main><section className="hero"><DotField /><div className="hero-content"><div className="intro"><h1>Build on the<br />Claude Platform</h1><p>Create agents and applications with frontier<br className="desktop-break" /> Claude models and managed agent infrastructure.</p></div><LoginForm /></div></section><CompanyLogos /></main><Footer /></>;
}

