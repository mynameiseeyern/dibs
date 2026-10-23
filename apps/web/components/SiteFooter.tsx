/** Privacy and terms, on the pages people land on (ARV-53). */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Legal">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="mailto:hello@dibby.social">Contact</a>
      </nav>
      <p className="paragraph-xs muted">dibs never holds or moves your money.</p>
    </footer>
  );
}
