import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLocation } from 'react-router-dom'
import { dataSource, type CollectionName, type DocumentName } from '@/repositories'
import { realtime } from '@/realtime'
import { can } from '@/domain/auth/permissions'
import { propositionCode, propositionTitle } from '@/domain/legislative/process'
import { useAuthStore } from '@/stores/authStore'
import type { PermissionAction, PermissionModule, Proposition } from '@/types'

/**
 * Hooks de leitura — a UI consome dados exclusivamente por aqui.
 * Chave de cache = nome da coleção; eventos realtime invalidam as coleções afetadas.
 */
export function useCollection<K extends CollectionName>(name: K) {
  return useQuery({ queryKey: [name], queryFn: () => dataSource.collection(name).list() })
}

export function useDocument<K extends DocumentName>(name: K) {
  return useQuery({ queryKey: [name], queryFn: () => dataSource.document(name).get(), staleTime: Infinity })
}

export const useOrganization = () => useDocument('organization')
export const useSettings = () => useDocument('settings')

/** Conecta o provider de tempo real ao cache (montado uma vez no App). */
export function useRealtimeSync() {
  const qc = useQueryClient()
  useEffect(
    () =>
      realtime.subscribe((event) => {
        event.collections.forEach((c) => qc.invalidateQueries({ queryKey: [c] }))
      }),
    [qc],
  )
}

export function usePermission() {
  const role = useAuthStore((s) => s.user?.role)
  const { data: matrix } = useDocument('permissions')
  return useCallback((module: PermissionModule, action: PermissionAction = 'view') => (matrix ? can(matrix, role, module, action) : false), [matrix, role])
}

/** Índices por ID para exibir nomes sem repetir buscas nas telas. */
export function useLookups() {
  const councilors = useCollection('councilors')
  const parties = useCollection('parties')
  const committees = useCollection('committees')
  const settings = useSettings()
  return useMemo(() => {
    const councilorMap = new Map((councilors.data ?? []).map((c) => [c.id, c]))
    const partyMap = new Map((parties.data ?? []).map((p) => [p.id, p]))
    const committeeMap = new Map((committees.data ?? []).map((c) => [c.id, c]))
    const typeMap = new Map((settings.data?.propositionTypes ?? []).map((t) => [t.id, t]))
    const quorumMap = new Map((settings.data?.quorumRules ?? []).map((q) => [q.id, q]))
    return {
      ready: !!(councilors.data && parties.data && committees.data && settings.data),
      councilors: councilorMap,
      parties: partyMap,
      committees: committeeMap,
      types: typeMap,
      quorums: quorumMap,
      councilorName: (id?: string | null) => (id ? (councilorMap.get(id)?.parliamentaryName ?? '—') : '—'),
      partyOf: (councilorId?: string) => partyMap.get(councilorMap.get(councilorId ?? '')?.partyId ?? ''),
      code: (p: Pick<Proposition, 'typeId' | 'number' | 'year'>) => propositionCode(p, typeMap.get(p.typeId)),
      title: (p: Pick<Proposition, 'typeId' | 'number' | 'year'>) => propositionTitle(p, typeMap.get(p.typeId)),
    }
  }, [councilors.data, parties.data, committees.data, settings.data])
}

export type Lookups = ReturnType<typeof useLookups>

/**
 * Executa uma ação de service com estado de carregamento e feedback via toast.
 * Erros de regra de negócio são exibidos ao usuário.
 */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>, options: { success?: string | ((r: R) => string); onSuccess?: (r: R) => void } = {}) {
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async (...args: A) => {
      setPending(true)
      try {
        const result = await fn(...args)
        const msg = typeof options.success === 'function' ? options.success(result) : options.success
        if (msg) toast.success(msg)
        options.onSuccess?.(result)
        return result
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.')
        return undefined
      } finally {
        setPending(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, options.success, options.onSuccess],
  )
  return { run, pending }
}

/**
 * Prefixo da área atual ('/admin' | '/presidencia' | '/vereador').
 * Páginas compartilhadas entre áreas montam links relativos à área em que estão.
 */
export function useAreaBase() {
  const { pathname } = useLocation()
  const area = pathname.split('/')[1]
  return area === 'presidencia' || area === 'vereador' ? `/${area}` : '/admin'
}

/** Relógio com atualização periódica (cronômetros e telas de plenário). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
