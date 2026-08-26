export interface SimpleOracleEffects {
  drawCards: number;
  loseLife: number;
  gainLife: number;
  counterTargetSpell: boolean;
  destroysCreature: boolean;
  destroysArtifactOrEnchantment: boolean;
  destroysNonartifactCreature: boolean;
  destroysNonblackCreature: boolean;
  disablesAttackAndBlock: boolean;
  entersDrawCards: number;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function numberFrom(value?: string): number {
  if (!value) return 0;
  const numeric = Number.parseInt(value, 10);
  if (Number.isFinite(numeric)) return numeric;
  return NUMBER_WORDS[value.toLowerCase()] ?? 0;
}

export function parseSimpleOracleEffects(oracleText?: string): SimpleOracleEffects {
  const text = oracleText?.toLowerCase() ?? '';
  const drawMatch = text.match(/draw(?:s)?\s+(a|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+cards?/);
  const loseMatch = text.match(/loses?\s+(\d+)\s+life/);
  const gainMatch = text.match(/gains?\s+(\d+)\s+life/);
  const entersDrawMatch = text.match(/when\s+.+?\s+enters(?: the battlefield)?,\s*(?:you\s+)?draw\s+(a|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+cards?/);

  return {
    drawCards: numberFrom(drawMatch?.[1]),
    loseLife: numberFrom(loseMatch?.[1]),
    gainLife: numberFrom(gainMatch?.[1]),
    counterTargetSpell: text.includes('counter target spell'),
    destroysCreature: text.includes('destroy target creature'),
    destroysArtifactOrEnchantment: text.includes('destroy target artifact or enchantment'),
    destroysNonartifactCreature: text.includes('destroy target nonartifact creature'),
    destroysNonblackCreature: text.includes('destroy target nonblack creature'),
    disablesAttackAndBlock: text.includes("can't attack or block") || text.includes('cannot attack or block'),
    entersDrawCards: numberFrom(entersDrawMatch?.[1]),
  };
}
