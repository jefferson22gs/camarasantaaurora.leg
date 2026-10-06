import { organizationSeed, settingsSeed } from './organization'
import { committeesSeed, councilorsSeed, legislaturesSeed, partiesSeed, usersSeed } from './people'
import { movementsSeed, opinionsSeed, propositionsSeed } from './propositions'
import { agendasSeed, attendanceSeed, impedimentsSeed, sessionsSeed, votesSeed, votingsSeed } from './sessions'
import { auditLogsSeed, notificationsSeed } from './activity'
import { DEFAULT_PERMISSIONS } from '@/domain/auth/permissions'

export { DEMO_SESSION_ID, VOTE_SEQUENCE_START } from './sessions'
export { ORG_ID } from './organization'

/** Dataset de demonstração. Incrementar SEED_VERSION força recarga em navegadores que já possuem dados antigos. */
export const SEED_VERSION = 1

export const collectionSeeds = {
  legislatures: legislaturesSeed,
  parties: partiesSeed,
  councilors: councilorsSeed,
  committees: committeesSeed,
  users: usersSeed,
  propositions: propositionsSeed,
  movements: movementsSeed,
  opinions: opinionsSeed,
  sessions: sessionsSeed,
  attendance: attendanceSeed,
  agendas: agendasSeed,
  impediments: impedimentsSeed,
  votings: votingsSeed,
  votes: votesSeed,
  notifications: notificationsSeed,
  auditLogs: auditLogsSeed,
}

export const documentSeeds = {
  organization: organizationSeed,
  settings: settingsSeed,
  permissions: DEFAULT_PERMISSIONS,
}
