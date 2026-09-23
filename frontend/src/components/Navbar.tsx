/**
 * Navbar — barra superior. Server component, sin estado.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M3 12h3l2-7 4 14 2-7h7" />
            </svg>
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              Investigación Operativa II
            </span>
            <span className="text-xs text-zinc-500">
              Calculadora · Colas M/M/1
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          <a
            href="#datos"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Datos
          </a>
          <a
            href="#resultados"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Resultados
          </a>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Proyecto académico
          </span>
        </nav>
      </div>
    </header>
  );
}
