import { describe, expect, it } from 'vitest'

import { planFor, type SettlementLine } from './settlement'
import type { ParticipantBalance } from './queries'

function balance(displayName: string, netCents: number, isYou = false): ParticipantBalance {
  return {
    participantId: displayName.toLowerCase(),
    displayName,
    isYou,
    paidCents: 0,
    contributedCents: 0,
    chargedCents: 0,
    netCents,
  }
}

describe('planFor', () => {
  it('names the transfers of the case in the specification', () => {
    const plan = planFor([balance('Ana', 6000), balance('Beto', -4000), balance('Carla', -2000)])

    expect(plan).toEqual<SettlementLine[]>([
      {
        fromParticipantId: 'beto',
        toParticipantId: 'ana',
        fromName: 'Beto',
        toName: 'Ana',
        amountCents: 4000,
        yours: null,
      },
      {
        fromParticipantId: 'carla',
        toParticipantId: 'ana',
        fromName: 'Carla',
        toName: 'Ana',
        amountCents: 2000,
        yours: null,
      },
    ])
  })

  it('proposes no transfer when every balance is zero', () => {
    expect(planFor([balance('Ana', 0), balance('Beto', 0), balance('Carla', 0)])).toEqual([])
  })

  it('marks the side the reader is on, and only their own lines', () => {
    const plan = planFor([
      balance('Ana', 6000),
      balance('Beto', -4000, true),
      balance('Carla', -2000),
    ])

    expect(plan.map((line) => line.yours)).toEqual(['pay', null])
  })

  it('marks a line the reader collects on', () => {
    const plan = planFor([
      balance('Ana', 6000, true),
      balance('Beto', -4000),
      balance('Carla', -2000),
    ])

    expect(plan.map((line) => line.yours)).toEqual(['collect', 'collect'])
  })
})
