import logo from '@renderer/assets/logo.png'

export function AboutScreen(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-line p-8 text-center">
        <img src={logo} alt="SLM Bellavista" className="h-16" />
        <div>
          <h2 className="text-lg font-semibold text-ink">SLM Bellavista - Control de Pesaje</h2>
          <p className="text-sm text-muted">Versión {__APP_VERSION__}</p>
        </div>
      </div>
    </div>
  )
}
