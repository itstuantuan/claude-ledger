'use client';
import { useRef } from 'react';

export function PrivacyChoices() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="footer-link" onClick={() => dialog.current?.showModal()}>Privacy choices</button>
    <dialog className="privacy-dialog" ref={dialog} aria-labelledby="privacy-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="privacy-content">
        <h2 id="privacy-title">Privacy choices</h2>
        <p>This local preview does not use analytics or advertising cookies. Your email stays in this page and is not sent to a server.</p>
        <button className="button primary" onClick={() => dialog.current?.close()} autoFocus>Done</button>
      </div>
    </dialog>
  </>;
}
