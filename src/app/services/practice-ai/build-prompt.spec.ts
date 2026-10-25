import type { CardFace } from '@domain/models/card.model';

import { DEFAULT_PROMPT_TEMPLATE, buildPrompt, termLine } from './build-prompt';

const basic = (n: number): CardFace => ({
  id: `i${n}`,
  cardType: 'basic',
  front: `term ${n}`,
  back: `término ${n}`,
});
const TEMPLATE = 'Hola.\n<reviewed>\n[[REPASADAS]]\n</reviewed>\n<hard>\n[[DIFICILES]]\n</hard>';

describe('buildPrompt', () => {
  it('pone las 11 repasadas y las 8 difíciles, una por línea como "anverso | reverso"', () => {
    const reviewed = Array.from({ length: 11 }, (_, index) => basic(index + 1));
    const hard = reviewed.slice(0, 8);

    const prompt = buildPrompt(TEMPLATE, reviewed, hard);

    const reviewedBlock = prompt.split('<reviewed>\n')[1]?.split('\n</reviewed>')[0];
    const hardBlock = prompt.split('<hard>\n')[1]?.split('\n</hard>')[0];
    expect(reviewedBlock?.split('\n')).toHaveLength(11);
    expect(reviewedBlock?.split('\n')[0]).toBe('term 1 | término 1');
    expect(hardBlock?.split('\n')).toHaveLength(8);
    expect(prompt).not.toContain('[[');
  });

  it('una cloze se lista con su texto, sin llaves ni separador', () => {
    expect(
      termLine({ id: 'c', cardType: 'cloze', front: 'She {{gave up}} too early', back: '' }),
    ).toBe('She gave up too early');
  });

  it('sin [[DIFICILES]], la lista va al final tras una línea en blanco y "Hard today:"', () => {
    const prompt = buildPrompt('Plantilla con [[REPASADAS]].', [basic(1)], [basic(1)]);

    expect(prompt).toBe('Plantilla con term 1 | término 1.\n\nHard today:\nterm 1 | término 1');
  });

  it('sin [[REPASADAS]], igual con "Reviewed today:"', () => {
    const prompt = buildPrompt('Solo [[DIFICILES]]', [basic(1), basic(2)], []);

    expect(prompt).toBe('Solo \n\nReviewed today:\nterm 1 | término 1\nterm 2 | término 2');
  });

  it('la plantilla por defecto es el texto de la spec, con sus dos marcadores', () => {
    expect(DEFAULT_PROMPT_TEMPLATE.startsWith("You're my English conversation partner.")).toBe(
      true,
    );
    expect(DEFAULT_PROMPT_TEMPLATE).toContain('<reviewed_terms>\n[[REPASADAS]]\n</reviewed_terms>');
    expect(DEFAULT_PROMPT_TEMPLATE).toContain('<hard_terms>\n[[DIFICILES]]\n</hard_terms>');
    expect(DEFAULT_PROMPT_TEMPLATE.endsWith("Let's start. Say hi and get us talking.")).toBe(true);

    const prompt = buildPrompt(DEFAULT_PROMPT_TEMPLATE, [basic(1)], [basic(1)]);
    expect(prompt).toContain('<reviewed_terms>\nterm 1 | término 1\n</reviewed_terms>');
    expect(prompt).toContain('<hard_terms>\nterm 1 | término 1\n</hard_terms>');
  });
});
