'use client'

export function Footer() {
  return (
    <footer className="saas-footer">
      <div className="saas-footer-inner">
        <div className="saas-footer-content">
          <p className="saas-footer-line-primary">© 2026 Chok Distribuidora.</p>
          <p className="saas-footer-line-secondary">
            Sistema desenvolvido por{' '}
            <a
              href="https://www.linkedin.com/in/laura-fradique-8b818320b?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
              target="_blank"
              rel="noopener noreferrer"
              className="saas-footer-link"
            >
              Laura Fradique
            </a>
            .
          </p>
          <p className="saas-footer-line-tertiary">Em caso de dúvidas, contate seu gestor.</p>
        </div>
      </div>
    </footer>
  )
}
