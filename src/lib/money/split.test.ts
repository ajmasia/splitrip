import { describe, expect, it } from 'vitest'

import { splitAmount, totalOf } from './split'

const [ana, beto, carla, dani] = ['a-ana', 'b-beto', 'c-carla', 'd-dani']

describe('splitAmount', () => {
  it('divides an amount that goes evenly', () => {
    const shares = splitAmount(6000, [ana, beto, carla, dani])

    expect(shares.map((share) => share.amountCents)).toEqual([1500, 1500, 1500, 1500])
    expect(totalOf(shares)).toBe(6000)
  })

  it('hands the leftover cent to the first participant', () => {
    const shares = splitAmount(1000, [ana, beto, carla])

    expect(shares).toEqual([
      { participantId: ana, amountCents: 334 },
      { participantId: beto, amountCents: 333 },
      { participantId: carla, amountCents: 333 },
    ])
    expect(totalOf(shares)).toBe(1000)
  })

  it('charges the same people the same cents however the participants arrive', () => {
    const oneWay = splitAmount(1000, [carla, ana, beto])
    const another = splitAmount(1000, [beto, carla, ana])

    expect(oneWay).toEqual(another)
    expect(oneWay).toEqual(splitAmount(1000, [ana, beto, carla]))
  })

  it('charges a cent to one person and nothing to the rest when there is nothing to divide', () => {
    const shares = splitAmount(1, [ana, beto, carla])

    expect(shares.map((share) => share.amountCents)).toEqual([1, 0, 0])
    expect(totalOf(shares)).toBe(1)
  })

  it('charges the whole amount to a lone participant', () => {
    expect(splitAmount(4321, [ana])).toEqual([{ participantId: ana, amountCents: 4321 }])
  })

  it('always adds up to the amount, whatever the amount and however many people', () => {
    const people = [ana, beto, carla, dani, 'e-eva', 'f-fran', 'g-gema']

    for (let amountCents = 1; amountCents <= 500; amountCents++) {
      for (let heads = 1; heads <= people.length; heads++) {
        const shares = splitAmount(amountCents, people.slice(0, heads))

        expect(totalOf(shares)).toBe(amountCents)
        expect(shares).toHaveLength(heads)
      }
    }
  })

  it('never spreads the shares by more than a cent', () => {
    const shares = splitAmount(1000, [ana, beto, carla])
    const amounts = shares.map((share) => share.amountCents)

    expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1)
  })

  it('refuses an amount of zero or less', () => {
    expect(() => splitAmount(0, [ana])).toThrow(RangeError)
    expect(() => splitAmount(-100, [ana])).toThrow(RangeError)
  })

  it('refuses an amount that is not a whole number of cents', () => {
    expect(() => splitAmount(10.5, [ana])).toThrow(TypeError)
  })

  it('refuses to split between nobody', () => {
    expect(() => splitAmount(1000, [])).toThrow(RangeError)
  })

  it('refuses to charge the same participant twice', () => {
    expect(() => splitAmount(1000, [ana, beto, ana])).toThrow(RangeError)
  })
})
