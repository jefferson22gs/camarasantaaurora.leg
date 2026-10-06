import { describe, expect, it } from 'vitest'
import { DEFAULT_PERMISSIONS, can } from '@/domain/auth/permissions'
import { formatCPF, formatDate, formatDateTime, formatDuration, formatPhone } from '@/lib/format'
import { matches } from '@/lib/utils'
import { nextPropositionNumber, propositionCode, propositionTitle } from '@/domain/legislative/process'

describe('RBAC', () => {
  it('administrador tem acesso total', () => {
    expect(can(DEFAULT_PERMISSIONS, 'admin', 'settings', 'edit')).toBe(true)
    expect(can(DEFAULT_PERMISSIONS, 'admin', 'audit', 'export')).toBe(true)
  })
  it('vereador vota mas não configura nem audita', () => {
    expect(can(DEFAULT_PERMISSIONS, 'councilor', 'voting', 'operate')).toBe(true)
    expect(can(DEFAULT_PERMISSIONS, 'councilor', 'settings')).toBe(false)
    expect(can(DEFAULT_PERMISSIONS, 'councilor', 'audit')).toBe(false)
  })
  it('presidência opera Ordem do Dia; secretaria não', () => {
    expect(can(DEFAULT_PERMISSIONS, 'presidency', 'order_of_day', 'operate')).toBe(true)
    expect(can(DEFAULT_PERMISSIONS, 'secretariat', 'order_of_day', 'operate')).toBe(false)
  })
  it('comissão emite pareceres', () => {
    expect(can(DEFAULT_PERMISSIONS, 'committee', 'opinions', 'create')).toBe(true)
    expect(can(DEFAULT_PERMISSIONS, undefined, 'opinions')).toBe(false)
  })
})

describe('Formatação pt-BR', () => {
  it('datas', () => {
    expect(formatDate('2026-10-02')).toBe('02/10/2026')
    expect(formatDateTime(new Date(2026, 9, 2, 19, 42, 15))).toBe('02/10/2026 19:42:15')
    expect(formatDate(null)).toBe('—')
  })
  it('cronômetro', () => {
    expect(formatDuration(120)).toBe('02:00')
    expect(formatDuration(65)).toBe('01:05')
    expect(formatDuration(-3)).toBe('00:00')
  })
  it('documentos', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01')
    expect(formatPhone('49999998888')).toBe('(49) 99999-8888')
  })
  it('busca ignora acentos e caixa', () => {
    expect(matches(['Projeto de Lei', 'Iluminação Pública'], 'iluminacao')).toBe(true)
    expect(matches(['João Martins'], 'joao mart')).toBe(true)
    expect(matches(['Ana'], 'carlos')).toBe(false)
  })
  it('identificação de proposições', () => {
    expect(propositionCode({ number: 25, year: 2026 }, { code: 'PL' })).toBe('PL 025/2026')
    expect(propositionTitle({ number: 25, year: 2026 }, { name: 'Projeto de Lei' })).toBe('Projeto de Lei nº 025/2026')
    expect(nextPropositionNumber([{ typeId: 'pl', year: 2026, number: 25 }, { typeId: 'pl', year: 2025, number: 90 }], 'pl', 2026)).toBe(26)
  })
})
