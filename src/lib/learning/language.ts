/** Language families that share syntax and the curated reference. */
export type LangFamily = 'python' | 'java' | 'cpp' | 'javascript' | 'other';

export function languageFamily(languageId: string): LangFamily {
  const id = languageId.toLowerCase();
  if (id.startsWith('python')) return 'python';
  if (id === 'java') return 'java';
  if (id === 'cpp' || id === 'c' || id === 'c++') return 'cpp';
  if (id === 'javascript' || id === 'typescript' || id === 'js' || id === 'ts') return 'javascript';
  return 'other';
}

/** Strip string literals and line comments so their contents don't trigger matches. */
export function stripLiteralsAndComments(line: string, family: LangFamily): string {
  const withoutStrings = line.replace(
    /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    '""',
  );
  const comment = family === 'python' ? /#.*$/ : /\/\/.*$/;
  return withoutStrings.replace(comment, '');
}
