import type { Attendance, Committee, Councilor, Proposition, Vote, Voting } from '@/types'

/** Estatísticas pessoais de um vereador (função pura, reutilizada no detalhe e no perfil). */
export function councilorStats(
  councilor: Councilor,
  data: { propositions?: Proposition[]; attendance?: Attendance[]; votes?: Vote[]; votings?: Voting[]; committees?: Committee[] },
) {
  const authored = (data.propositions ?? []).filter((p) => p.authorId === councilor.id || p.coauthorIds.includes(councilor.id))
  const attendance = (data.attendance ?? []).filter((a) => a.councilorId === councilor.id && a.status !== 'pending')
  const present = attendance.filter((a) => a.status === 'present').length
  const votingMap = new Map((data.votings ?? []).map((v) => [v.id, v]))
  const votes = (data.votes ?? []).filter((v) => v.councilorId === councilor.id).map((v) => ({ vote: v, voting: votingMap.get(v.votingId) }))
  const committees = (data.committees ?? []).filter((c) => c.memberIds.includes(councilor.id))
  return {
    authored,
    attendance,
    present,
    attendanceRate: attendance.length ? present / attendance.length : 0,
    votes,
    committees,
  }
}
