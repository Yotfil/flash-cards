import type { CardFace } from '@domain/models/card.model';
import { clozeSegments } from '@services/cards/cloze/parse-cloze';

/** Dónde van todos los ítems del día y los difíciles en la plantilla. */
export const REVIEWED_MARKER = '[[REPASADAS]]';
export const HARD_MARKER = '[[DIFICILES]]';

// Si la plantilla no trae un marcador, su lista va al final con este rótulo.
const REVIEWED_HEADING = 'Reviewed today:';
const HARD_HEADING = 'Hard today:';

/**
 * La plantilla por defecto: una conversación en inglés que usa todos los términos del día e
 * insiste en los difíciles (texto exacto de la spec `practica-con-ia`).
 */
export const DEFAULT_PROMPT_TEMPLATE = `You're my English conversation partner. We'll have a natural, friendly chat, like two friends talking, and you'll help me improve along the way. I'm a native Spanish speaker.

TODAY'S TERMS
These are the words and phrases I practiced today. The right side is the meaning I'm learning, in Spanish.

<reviewed_terms>
[[REPASADAS]]
</reviewed_terms>

The ones below are the ones I struggled with. They matter most: the main goal of this session is for me to end up using all of them confidently.

<hard_terms>
[[DIFICILES]]
</hard_terms>

HOW TO USE THE TERMS
- Don't list or define them at the start. Weave them naturally into the conversation and steer topics so they come up, the hard ones first and more often.
- Create openings for ME to use them: ask questions whose natural answer needs one of these terms.
- If I avoid a term or use it wrong, nudge me ("How would you say that using 'give up'?") before giving me the answer.
- Keep a private tally of which terms I used correctly on my own.

HOW WE TALK
- If I give you a topic, we talk about that. If not, pick something relatable or ask what's on my mind.
- Keep your messages short (2-4 sentences) and end most of them with a question, so I do most of the talking.
- Natural conversation, not an interview or a lesson.
- Challenge me a little but keep it achievable. Adapt to the level you see in my writing.

CORRECTIONS
- Grammar mistake: correct it inline, briefly, then continue. Format: [Correction: "X" → "Y" because ...]
- Wrong word usage: explain the right usage in one line.
- If I ask "how do I say [Spanish word/phrase]?", give me the English with one quick example.
- If I'm struggling to express something, help me find the words.
- Minor mistakes can wait until the end of my turn. Don't praise every sentence; if I'm doing well, just keep talking.

END OF SESSION
When I say "feedback" or "session over", stop the conversation and give me:
1. Terms report, one line per term: OK = used correctly on my own · HELP = used, but needed help or had errors · SKIP = never came up.
2. Patterns you noticed (good and bad) and 2-3 things to practice.
3. A code block I can import into my flashcard app with the NEW words and phrases from this session: things I didn't know, misused, or asked about. Do NOT include any of today's terms. One per line, exactly this format, nothing else inside the block:
   english term or phrase | meaning in Spanish

Let's start. Say hi and get us talking.`;

/** Una línea por ítem: "anverso | reverso"; una cloze, su texto sin las llaves ni separador. */
export function termLine(face: CardFace): string {
  if (face.cardType === 'cloze') {
    return clozeSegments(face.front)
      .map((segment) => segment.text)
      .join('');
  }
  return `${face.front} | ${face.back}`;
}

/**
 * El prompt de hoy: la plantilla con la lista de todos los ítems del día en `[[REPASADAS]]` y la
 * de los difíciles en `[[DIFICILES]]`. Un marcador ausente añade su lista al final.
 */
export function buildPrompt(
  template: string,
  reviewed: readonly CardFace[],
  hard: readonly CardFace[],
): string {
  const withReviewed = fill(template, REVIEWED_MARKER, REVIEWED_HEADING, reviewed);
  return fill(withReviewed, HARD_MARKER, HARD_HEADING, hard);
}

function fill(
  template: string,
  marker: string,
  heading: string,
  faces: readonly CardFace[],
): string {
  const list = faces.map(termLine).join('\n');
  return template.includes(marker)
    ? template.split(marker).join(list)
    : `${template}\n\n${heading}\n${list}`;
}
