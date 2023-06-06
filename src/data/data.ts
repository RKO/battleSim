import ClassOptions from '../model/classOptions'
import { Action, AtkAction, Creature, DiceFormula, HealAction } from "../model/model"
import {z} from 'zod'
import { getMonster } from './monsters'
import { v4 as uuid } from 'uuid'

// TODO: 
// 1) Add more options to the templates
// 2) Find a way to handle multiclasses

function artificer(level: number, options: z.infer<typeof ClassOptions.artificer>): Creature {
    const INT = scale(level, { 1: 4, 4: 5 })
    const CON = scale(level, { 1: 2, 8: 3, 12: 4, 16: 5 })
    const PB = pb(level)
    const AC = scale(level, {1: 17, 3: 18, 5: 19, 8: 20, 11: 21, 16: 22})
    const toHit = INT + PB
    const DC = 8 + PB + INT

    const fireBolt = `${cantrip(level)}d10`
    const arcaneFireArm = scale(level, {1: '', 6: '+1d8[Arcane Firearm]'})

    const result: Creature = {
        id: uuid(),
        name: name('Artificer', level),
        AC: AC,
        saveBonus: scale(level, {1: PB, 20: PB + 6}),
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: 'Firebolt',
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    targets: 1,
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: fireBolt + arcaneFireArm,
                    condition: 'default',
                },
                {
                    id: uuid(),
                    name: 'Shield',
                    actionSlot: REACTION,
                    type: 'buff',
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 6, 13: 7, 15: 8, 17: 9})},
                    condition: 'is under half HP',
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: '1 round',
                        ac: 5,
                    },
                },
            ],
            2: [{
                id: uuid(),
                name: 'Artificer Infusions',
                actionSlot: PASSIVE,
                type: 'buff',
                freq: '1/fight',
                condition: 'is available',
                targets: 100,
                target: 'ally with the most HP',
                buff: {
                    duration: 'entire encounter',
                    toHit: scale(level, {1: 1, 12: 2}),
                    ac: scale(level, {1: 1, 12: 2}),
                }
            }],
            3: [{
                id: uuid(),
                name: 'Shield Turret',
                actionSlot: BONUS_ACTION,
                type: 'heal',
                freq: 'at will',
                condition: 'default',
                targets: 2,
                target: 'ally with the least HP',
                amount: `1d8+${INT}`,
                tempHP: true,
            }],
        }),
    }

    return result
}

function barbarian(level: number, options: z.infer<typeof ClassOptions.barbarian>): Creature {
    const STR = scale(level, { 1: 4, 4: 5, 20: 7 })
    const CON = scale(level, { 1: 2, 8: 3, 12: 4, 16: 5, 20: 7 })
    const DEX = 2
    const PB = pb(level)
    const RAGE = scale(level, { 1: 2, 9: 3, 16: 4 })

    const result: Creature = {
        id: uuid(),
        name: name('Barbarian', level),
        AC: 10 + DEX + CON,
        saveBonus: PB,
        hp: hp(level, 12, CON),
        count: 1,
        mode: 'player',
        actions: [
            {
                id: uuid(),
                name: `Greatsword${level >= 5 ? ' x2' : ''}`,
                actionSlot: ACTION,
                type: 'atk',
                targets: scale(level, {1: 1, 5: 2}),
                condition: 'default',
                freq: 'at will',
                target: 'enemy with least HP',
                toHit: `${PB}[PB] + ${STR}[STR]` 
                    + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
                    + (options.gwm ? ` - 5[GWM]` : ''),
                dpr: `2d6 + ${STR}[STR] + ${RAGE}[RAGE]`
                    + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
                    + (options.gwm ? ` + 10[GWM]` : ''),
            },
            {
                id: uuid(),
                name: 'Rage',
                actionSlot: BONUS_ACTION,
                type: 'buff',
                targets: 1,
                target: 'self',
                freq: { reset: 'lr', uses: scale(level, {1: 2, 3: 3, 6: 4, 12: 5, 17: 6}) },
                condition: 'is available',
                buff: {
                    duration: 'entire encounter',
                    damageTakenMultiplier: 0.5,
                },
            },
        ],
    }

    if (level >= 2) {
        result.actions.push({
            id: uuid(),
            name: 'Reckless Attack',
            actionSlot: PASSIVE,
            type: 'buff',
            targets: 1,
            condition: 'default',
            freq: 'at will',
            target: 'self',
            buff: {
                duration: '1 round',
                condition: 'Attacks and is attacked with Advantage',
            }
        })
    }

    return result
}


function bard(level: number, options: z.infer<typeof ClassOptions.bard>): Creature {
    const CON = 2
    const CHA = scale(level, {1: 4, 4: 5})
    const DEX = scale(level, {1: 2, 12: 3, 16: 4})
    const PB = pb(level)
    const DC = 8 + PB + CHA
    const BARDIC_INSPI = scale(level, {1: '1d6', 5: '1d8', 10: '1d10', 15: '1d12'})

    const result: Creature = {
        id: uuid(),
        name: name('Bard', level),
        AC: 13 + DEX,
        saveBonus: PB,
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: 'Vicious Mockery',
                    actionSlot: ACTION,
                    type: 'atk',
                    targets: 1,
                    condition: 'default',
                    freq: 'at will',
                    target: 'enemy with highest DPR',
                    toHit: DC,
                    useSaves: true,
                    dpr: `${cantrip(level)}d4`,
                    riderEffect: {
                        dc: 100,
                        buff: {
                            duration: 'until next attack made',
                            condition: 'Attacks with Disadvantage',
                        },
                    }
                },
                {
                    id: uuid(),
                    name: 'Bane',
                    actionSlot: ACTION,
                    type: 'debuff',
                    targets: 3,
                    condition: 'is available',
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 6, 13: 7, 15: 8, 17: 9})},
                    target: 'enemy with highest DPR',
                    saveDC: DC,
                    buff: {
                        duration: 'entire encounter',
                        toHit: '-1d4',
                        save: '-1d4',
                    },
                },
                {
                    id: uuid(),
                    name: 'Bardic Inspiration',
                    actionSlot: BONUS_ACTION,
                    type: 'buff',
                    targets: 1,
                    condition: (level < 5) ? 'is available' : 'default',
                    freq: (level < 5) ? '1/fight' : 'at will',
                    target: 'ally with the highest DPR',
                    buff: {
                        duration: '1 round',
                        toHit: BARDIC_INSPI,
                    },
                },
                {
                    id: uuid(),
                    name: (level <= 9) ? 'Cure Wounds' : 'Mass Cure Wounds',
                    actionSlot: ACTION,
                    type: 'heal',
                    targets: (level <= 9) ? 1 : 6,
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 3: 2, 5: 3, 7: 4, 9: 2, 11: 3, 13: 4, 15: 5, 17: 6})},
                    condition: 'ally at 0 HP',
                    target: 'ally with the least HP',
                    amount: `${Math.ceil(level / 3)}d8 + ${CHA}`,
                }
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Hypnotic Pattern',
                    actionSlot: ACTION,
                    type: 'debuff',
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 5: 1, 9: 2, 13: 3, 17: 4})},
                    condition: 'is available',
                    targets: 2,
                    target: 'enemy with highest DPR',
                    saveDC: DC,
                    buff: {
                        duration: '1 round',
                        condition: 'Incapacitated',
                    },
                },
            ]
        }),
    }

    return result
}

function cleric(level: number, options: z.infer<typeof ClassOptions.cleric>): Creature {
    const CON = 2
    const WIS = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const DC = 8 + PB + WIS
    const toHit = PB + WIS
    
    return {
        id: uuid(),
        name: name('Cleric', level),
        AC: scale(level, { 1: 17, 3: 18, 5: 19, 8: 20 }),
        saveBonus: PB,
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: 'Sacred Flame',
                    actionSlot: ACTION,
                    type: 'atk',
                    targets: 1,
                    freq: 'at will',
                    condition: 'default',
                    target: 'enemy with least HP',
                    useSaves: true,
                    toHit: DC,
                    dpr: `${cantrip(level)}d8` + (level >= 8 ? ' + 1d8[Potent Spellcasting]' : ''),
                },
                {
                    id: uuid(),
                    name: 'Bless',
                    actionSlot: ACTION,
                    type: 'buff',
                    targets: 3,
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 6, 13: 7, 15: 8, 17: 9})},
                    condition: 'not used yet',
                    target: 'ally with the highest DPR',
                    buff: {
                        duration: 'entire encounter',
                        save: '1d4',
                        toHit: '1d4',
                    }
                },
                {
                    id: uuid(),
                    name: scale(level, { 1: 'Cure Wounds', 11: 'Heal' }),
                    actionSlot: ACTION,
                    type: 'heal',
                    targets: 1,
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 3: 2, 5: 3, 7: 4, 9: 5, 11: 1, 13: 2, 15: 3})},
                    condition: 'ally at 0 HP',
                    target: 'ally with the least HP',
                    amount: scale(level, {1: `${Math.ceil(level / 3)}d8 + ${WIS}`, 11: 70 }),
                },
            ],
            3: [
                {
                    id: uuid(),
                    name: 'Spiritual Weapon',
                    actionSlot: BONUS_ACTION,
                    type: 'atk',
                    targets: 1,
                    freq: 'at will',
                    condition: 'default',
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `${Math.ceil(level / 6)}d8 + ${WIS}`,
                },
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Spirit Guardians',
                    actionSlot: ACTION,
                    type: 'atk',
                    targets: 2,
                    freq: 'at will',
                    condition: 'default',
                    target: 'enemy with least HP',
                    useSaves: true,
                    halfOnSave: true,
                    toHit: DC,
                    dpr: `${(Math.ceil(level / 5) + 2)}d6`,
                },
                {
                    id: uuid(),
                    name: scale(level, {1: 'Mass Healing Word', 9: 'Mass Cure Wounds', 17: 'Mass Heal' }),
                    actionSlot: ACTION,
                    type: 'heal',
                    targets: 6,
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 5: 1, 9: 2, 13: 3, 17: 4})},
                    condition: 'is under half HP',
                    target: 'ally with the least HP',
                    amount: scale(level, {1: `1d4 + ${WIS}`, 9: `3d8 + ${WIS}`, 17: 70}),
                },
            ],
        }),
    }
}

function druid(level: number, options: z.infer<typeof ClassOptions.druid>): Creature {
    const CON = 2
    const DEX = 2
    const WIS = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const DC = 8 + PB + WIS
    const toHit = PB + WIS

    if (level === 1) {
        return {
            id: uuid(),
            name: name('Druid', level),
            AC: 14 + DEX,
            saveBonus: PB,
            hp: hp(level, 8, CON),
            count: 1,
            mode: 'player',
            actions: [
                {
                    id: uuid(),
                    name: 'Shillelagh',
                    actionSlot: ACTION,
                    type: 'atk',
                    condition: 'default',
                    freq: 'at will',
                    targets: 1,
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `1d8 + ${WIS}`,
                },
                {
                    id: uuid(),
                    name: 'Cure Wounds',
                    actionSlot: ACTION,
                    type: 'heal',
                    targets: 1,
                    freq: '1/day',
                    condition: 'ally at 0 HP',
                    target: 'ally with the least HP',
                    amount: `1d8 + ${WIS}`,
                },
            ],
        }
    }

    const wildshape = scale<Creature>(level, {
        2: getMonster('Dire Wolf')!,
        6: getMonster('Giant Constrictor Snake')!,
        9: getMonster('Giant Scorpion')!,
        10: getMonster('Fire Elemental')!,
    })

    return {
        id: uuid(),
        name: name('Druid', level),
        AC: wildshape.AC,
        saveBonus: PB,
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                ...wildshape.actions,
                {
                    id: uuid(),
                    name: `Wild Shape: ${wildshape.name}`,
                    actionSlot: BONUS_ACTION,
                    type: 'heal',
                    target: 'self',
                    targets: 1,
                    condition: 'has no THP',
                    freq: scale(level, {1: { reset: 'sr', uses: 2}, 20: 'at will'}),
                    amount: wildshape.hp,
                    tempHP: true,
                },
            ],
            18: [
                {
                    id: uuid(),
                    name: 'Heal',
                    actionSlot: ACTION,
                    type: 'heal',
                    target: 'ally with the least HP',
                    targets: 1,
                    condition: 'ally at 0 HP',
                    freq: '1/fight',
                    amount: 70,
                },
                {
                    id: uuid(),
                    name: 'Guardian of Nature',
                    actionSlot: BONUS_ACTION,
                    type: 'buff',
                    target: 'self',
                    targets: 1,
                    condition: 'default',
                    freq: '1/fight',
                    buff: {
                        duration: 'entire encounter',
                        condition: 'Attacks with Advantage',
                        damage: '2d6',
                    },
                }
            ]
        })
    }
}

function fighter(level: number, options: z.infer<typeof ClassOptions.fighter>): Creature {
    const CON = 2
    const STR = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const AC = scale(level, { 1: 16, 3: 17, 6: 18 })
    const toHit = `${PB}[PB] + ${STR}[STR]` 
        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
        + (options.gwm ? ` - 5[GWM]` : '')

    const attacks = scale(level, {1: 1, 5: 2, 11: 3, 20: 4})

    const action: Action = {
        id: uuid(),
        name: `Greatsword${attacks > 1 ? ' x' + attacks : ''}`,
        actionSlot: ACTION,
        type: 'atk',
        freq: 'at will',
        condition: 'default',
        target: 'enemy with least HP',
        targets: attacks,
        toHit: toHit,
        dpr: `2d6 + ${STR}[STR]`
            + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
            + (options.gwm ? ' + 10[GWM]' : '')
    }

    return {
        id: uuid(),
        name: name('Fighter', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 10, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                action,
                {
                    id: uuid(),
                    name: 'Second Wind',
                    actionSlot: BONUS_ACTION,
                    type: 'heal',
                    target: 'self',
                    freq: '1/fight',
                    condition: 'is under half HP',
                    targets: 1,
                    amount: `1d10 + ${level}`,
                }
            ],
            2: [
                {
                    id: uuid(),
                    name: `Action Surge: ${action.name}`,
                    actionSlot: 4,
                    freq: '1/fight',
                    condition: 'is available',
                    type: 'atk',
                    target: 'enemy with least HP',
                    targets: attacks,
                    toHit: toHit,
                    dpr: action.dpr,
                }
            ],
            17: [
                {
                    id: uuid(),
                    name: `Action Surge: ${action.name}`,
                    actionSlot: 5,
                    freq: '1/fight',
                    condition: 'is available',
                    type: 'atk',
                    target: 'enemy with least HP',
                    targets: attacks,
                    toHit: toHit,
                    dpr: action.dpr,
                }
            ]
        })
    }
}

function monk(level: number, options: z.infer<typeof ClassOptions.monk>): Creature {
    const CON = 2
    const DEX = scale(level, {1: 4, 4: 5})
    const WIS = scale(level, {1: 2, 8: 3, 12: 4, 16: 5})
    const PB = pb(level)
    const toHit = PB + DEX
    const DC = 8 + PB + WIS
    const AC = 10 + DEX + WIS

    const martialArtsDie = scale(level, {1: '1d4', 5: '1d6', 11: '1d8', 17: '1d10'})

    return {
        id: uuid(),
        name: name('Monk', level),
        AC: AC,
        saveBonus: scale(level, {1: PB, 14: PB + 3}),
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: scale(level, {1: 'Quarterstaff', 5: 'Quarterstaff x2 + Stunning Strike'}),
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: scale(level, {1: 1, 5: 2}),
                    target: 'enemy with highest DPR',
                    toHit: toHit,
                    dpr: `1d10 + ${DEX}`,

                    riderEffect: (level < 5) ? undefined : {
                        dc: DC,
                        buff: {
                            duration: '1 round',
                            condition: 'Stunned',
                        },
                    },
                },
                {
                    id: uuid(),
                    name: scale(level, {1: 'Unarmed Strike', 3: 'Flurry of Blows', 9: 'Flurry of Blows + Stunning Strike'}),
                    actionSlot: BONUS_ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: scale(level, {1: 1, 3: 2}),
                    target: 'enemy with highest DPR',
                    toHit: toHit,
                    dpr: `${martialArtsDie} + ${DEX}`,

                    riderEffect: (level < 9) ? undefined : {
                        dc: DC,
                        buff: {
                            duration: '1 round',
                            condition: 'Stunned',
                        },
                    },
                },
            ],
        }),
    }
}

function paladin(level: number, options: z.infer<typeof ClassOptions.paladin>): Creature {
    const CON = 2
    const STR = scale(level, {1: 4, 4: 5})
    const CHA = scale(level, {1: 2, 8: 3, 12: 5})
    const PB = pb(level)
    const AC = scale(level, {1: 17, 3: 18, 5: 19, 8: 20, 11: 21, 16: 22})
    const toHit = `${PB}[PB] + ${STR}[STR]` 
        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
        + (options.gwm ? ` - 5[GWM]` : '')

    return {
        id: uuid(),
        name: name('Paladin', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 10, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: scale(level, {1: 'Longsword', 5: 'Longsword x2'}),
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: scale(level, {1: 1, 5: 2}),
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `1d8 + ${STR}[STR]`
                        + (level > 1 ? ' + 2[Fighting Style]' : '')
                        + (options.weaponBonus ? ` + ${options.weaponBonus}` : '')
                        + (options.gwm ? ' + 10[GWM]' : '')
                        + (level >= 10 ? ' + 1d8[IDS]' : ''),
                },
                {
                    id: uuid(),
                    name: 'Lay on Hands',
                    actionSlot: ACTION,
                    type: 'heal',
                    freq: '1/day',
                    condition: 'ally at 0 HP',
                    targets: 1,
                    target: 'ally with the least HP',
                    amount: 5 * level,
                },
            ],
            2: [
                {
                    id: uuid(),
                    name: 'Divine Smite',
                    actionSlot: 4,
                    type: 'buff',
                    freq: scale(level, {1: "1/day", 5: { reset: 'lr', uses: Math.floor(level/2)}}),
                    condition: scale(level, {1: "is available", 11: 'default'}),
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: 'until next attack made',
                        damage: `${scale(level, {1: 2, 5: 3, 11: 4, 17: 5})}d8`,
                    },
                },
            ],
            6: [
                {
                    id: uuid(),
                    name: 'Aura of Protection',
                    actionSlot: 5,
                    type: 'buff',
                    freq: 'at will',
                    condition: 'default',
                    targets: 2,
                    target: 'ally with the least HP',
                    buff: {
                        duration: '1 round',
                        save: CHA,
                    },
                },
            ],
        }),
    }
}

function ranger(level: number, options: z.infer<typeof ClassOptions.ranger>): Creature {
    const CON = 2
    const DEX = scale(level, {1: 4, 4: 5})
    const WIS = scale(level, {1: 2, 8: 3, 12: 5})
    const PB = pb(level)
    const AC = DEX + scale(level, {1: 12, 5: 13, 11: 14 })
    const toHit = `${PB}[PB] + ${DEX}[DEX]` 
        + (level > 1 ? ' + 2[ARCHERY]' : '')
        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
        + (options.ss ? ` - 5[SS]` : '')
    
    return {
        id: uuid(),
        name: name('Ranger', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 10, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: scale(level, {
                        1: "Hand Crossbow", 
                        2: "Hand Crossbow + Hunter's Mark", 
                        4: "Hand Crossbow + Crossbow Expert + Hunter's Mark", 
                        5: "Hand Crossbow x2 + Crossbow Expert + Hunter's Mark" 
                    }),
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: scale(level, {1: 1, 4: 2, 5: 3}),
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `1d6 + ${DEX}[DEX]`
                        + (level > 1 ? ' + 1d6[HM]' : '')
                        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
                        + (options.ss ? ' + 10[SS]' : ''),
                },
            ],
        }),
    }
}

function rogue(level: number, options: z.infer<typeof ClassOptions.rogue>): Creature {
    const CON = 2
    const DEX = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const AC = DEX + scale(level, {1: 12, 5: 13, 11: 14 })
    const sneakAttack = `${Math.ceil(level/2)}d6`
    const toHit = `${PB}[PB] + ${DEX}[DEX]` 
        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
        + (options.ss ? ` - 5[SS]` : '')

    return {
        id: uuid(),
        name: name('Rogue', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: scale(level, { 
                        1: "Hand Crossbow", 
                        4: "Hand Crossbow + Crossbow Expert" 
                    }),
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: scale(level, {1: 1, 4: 2}),
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `1d6 + ${DEX}[DEX]`
                        + (options.weaponBonus ? ` + ${options.weaponBonus}[WEAPON]` : '')
                        + (options.ss ? ' + 10[SS]' : ''),
                },
                {
                    id: uuid(),
                    name: 'Sneak Attack',
                    actionSlot: PASSIVE,
                    type: 'buff',
                    freq: 'at will',
                    condition: 'default',
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: 'until next attack made',
                        damage: sneakAttack
                    }
                },
            ],
            2: [
                {
                    id: uuid(),
                    name: 'Cunning Action: Hide',
                    actionSlot: BONUS_ACTION,
                    type: 'buff',
                    freq: 'at will',
                    condition: 'default',
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: 'until next attack made',
                        condition: 'Attacks with Advantage',
                    },
                },
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Uncanny Dodge',
                    actionSlot: REACTION,
                    type: 'buff',
                    target: 'self',
                    targets: 1,
                    freq: 'at will',
                    condition: 'default',
                    buff: {
                        duration: 'until next attack taken',
                        damageTakenMultiplier: 0.5,
                    },
                }
            ]
        }),
    }
}

function sorcerer(level: number, options: z.infer<typeof ClassOptions.sorcerer>): Creature {
    const CON = 2
    const DEX = 2
    const CHA = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const AC = 13 + DEX
    const toHit = PB + CHA
    const DC = 8 + PB + CHA

    return {
        id: uuid(),
        name: name('Sorcerer', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 6, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: 'Fire Bolt',
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: 1,
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `${cantrip(level)}d10`,
                },
            ],
            3: [
                {
                    id: uuid(),
                    name: 'Quickened Mirror Image',
                    actionSlot: BONUS_ACTION,
                    type: 'buff',
                    freq: { reset: 'lr', uses: scale(level, {1: 1, 5: 2, 9: 3, 13: 4, 17: 5})},
                    condition: 'is available',
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: 'entire encounter',
                        damageTakenMultiplier: 0.25,
                    },
                },
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Quickened Fireball',
                    actionSlot: BONUS_ACTION,
                    type: 'atk',
                    freq: { reset: 'lr', uses: scale(level, {1: 2, 5: 2, 6: 3, 9: 4, 12: 5, 15: 6, 18: 7})},
                    condition: 'is available',
                    targets: 2,
                    target: 'enemy with least HP',
                    useSaves: true,
                    halfOnSave: true,
                    toHit: DC,
                    dpr: '8d6',
                }
            ]
        }),
    }
}

function warlock(level: number, options: z.infer<typeof ClassOptions.warlock>): Creature {
    const CON = 2
    const DEX = 2
    const CHA = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const AC = 13 + DEX
    const DC = 8 + PB + CHA
    const toHit = PB + CHA

    return {
        id: uuid(),
        name: name('Warlock', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 8, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                {
                    id: uuid(),
                    name: 'Eldritch Blast + Hex',
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: cantrip(level),
                    target: 'enemy with least HP',
                    toHit: toHit,
                    dpr: `1d10 + 1d6[HEX]`
                        + (level > 1 ? ` + ${CHA}[AB]` : ''),
                },
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Hypnotic Pattern',
                    actionSlot: ACTION,
                    type: 'debuff',
                    freq: { reset: 'sr', uses: scale(level, {1: 1, 5: 2, 11: 3, 17: 4})},
                    condition: 'not used yet',
                    targets: 2,
                    target: 'enemy with highest DPR',
                    saveDC: DC,
                    buff: {
                        duration: '1 round',
                        condition: 'Incapacitated',
                    },
                },
            ],
        }),
    }
}

function wizard(level: number, options: z.infer<typeof ClassOptions.wizard>): Creature {
    const CON = 2
    const DEX = 2
    const INT = scale(level, {1: 4, 4: 5})
    const PB = pb(level)
    const AC = 13 + DEX
    const toHit = PB + INT
    const DC = 8 + PB + INT

    return {
        id: uuid(),
        name: name('Wizard', level),
        AC: AC,
        saveBonus: PB,
        hp: hp(level, 6, CON),
        count: 1,
        mode: 'player',
        actions: scaleArray<Action>(level, {
            1: [
                ...(level > 11 ? [] : [
                    {
                        id: uuid(),
                        name: 'Fire Bolt',
                        actionSlot: ACTION,
                        type: 'atk',
                        freq: 'at will',
                        condition: 'default',
                        targets: 1,
                        target: 'enemy with least HP',
                        toHit: toHit,
                        dpr: `${cantrip(level)}d10`,
                    } as AtkAction
                ]),
                {
                    id: uuid(),
                    name: 'Shield',
                    actionSlot: REACTION,
                    type: 'buff',
                    freq: { reset: 'lr', uses: Math.ceil(level/2)},
                    condition: scale(level, {1: 'is under half HP', 8: 'default'}),
                    targets: 1,
                    target: 'self',
                    buff: {
                        duration: '1 round',
                        ac: 5,
                    },
                },
            ],
            5: [
                {
                    id: uuid(),
                    name: 'Fireball',
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: { reset: 'lr', uses: Math.ceil(level/3)},
                    condition: 'is available',
                    targets: 2,
                    target: 'enemy with least HP',
                    useSaves: true,
                    halfOnSave: true,
                    toHit: DC,
                    dpr: '8d6',
                },
                {
                    id: uuid(),
                    name: 'Hypnotic Pattern',
                    actionSlot: ACTION,
                    type: 'debuff',
                    freq: { reset: 'lr', uses: Math.ceil(level/3)},
                    condition: 'is available',
                    targets: 2,
                    target: 'enemy with highest DPR',
                    saveDC: DC,
                    buff: {
                        duration: '1 round',
                        condition: 'Incapacitated',
                    },
                },
            ],
            13: [
                {
                    id: uuid(),
                    name: 'Draconic transformation',
                    actionSlot: BONUS_ACTION,
                    type: 'atk',
                    freq: 'at will',
                    condition: 'default',
                    targets: 2,
                    target: 'enemy with least HP',
                    useSaves: true,
                    halfOnSave: true,
                    toHit: DC,
                    dpr: '8d6',
                },
            ],
            17: [
                {
                    id: uuid(),
                    name: 'Meteor Swarm',
                    actionSlot: ACTION,
                    type: 'atk',
                    freq: '1/day',
                    condition: 'is available',
                    targets: 3,
                    target: 'enemy with least HP',
                    useSaves: true,
                    halfOnSave: true,
                    toHit: DC,
                    dpr: '40d6',
                },
            ]
        }),
    }
}

export const PlayerTemplates = {
    artificer,
    barbarian,
    bard,
    cleric,
    druid,
    fighter,
    monk,
    paladin,
    ranger,
    rogue,
    sorcerer,
    warlock,
    wizard,
} as const


/*  UTILS   */

const ACTION = 0
const BONUS_ACTION = 1
const REACTION = 4
const PASSIVE = 5
const RIDER_EFFECT = 6

function scale<T>(currentLevel: number, levelScale: {[minLevel: number]: T}) {
    const level = Object.keys(levelScale)
        .map(Number)
        .filter(scaleLevel => (scaleLevel <= currentLevel))
        .reduce((a, b) => Math.max(a, b))

    return levelScale[level]
}

function scaleArray<T>(currentLevel: number, minLevelScale: {[minLevel: number]: T[]}, maxLevelScale?: {[minLevel: number]: T[]}): T[] {
    return [
        ...Object.keys(minLevelScale)
            .map(Number)
            .filter(level => (level <= currentLevel))
            .flatMap(level => minLevelScale[level]),
        ...!maxLevelScale ? [] : Object.keys(maxLevelScale)
            .map(Number)
            .filter(level => (level >= currentLevel))
            .flatMap(level => minLevelScale[level]),
    ]
}

function multiattack(level: number, expr: DiceFormula) {
    if (level < 5) return expr

    return `(${expr})*2`
}

const ADVANTAGE = 4.5
const DISADVANTAGE = -4.5
const d4 = 2.5
const d6 = 3.5
const d8 = 4.5
const d10 = 5.5
const d12 = 6.5
const cantrip = (level: number) => scale(level, {1: 1, 5: 2, 11: 3, 17: 4})

function hp(level: number, dieSize: number, con: number) {
    return (level) * (con + dieSize / 2) + (dieSize / 2) 
}

function pb(level: number) {
    return scale(level, { 1: 2, 5: 3, 9: 4, 13: 5, 17: 6 })
}

function name(className: string, level: number) {
    return `Lv${level} ${className}`
}