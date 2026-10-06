import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Compass, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/common/states'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-7" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-primary">Erro 404</p>
      <h1 className="mt-1 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">O endereço acessado não existe ou foi movido.</p>
      <Button asChild className="mt-6">
        <Link to="/">Ir para o início</Link>
      </Button>
    </div>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div>
        <ErrorState title="Ocorreu um erro inesperado" error={error} />
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw /> Recarregar
          </Button>
          <Button asChild>
            <Link to="/">Início</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
