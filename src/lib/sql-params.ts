/** Bind legacy ? placeholders without touching quoted SQL strings or comments. */
export function bindParams(sql: string, params: unknown[]): { text: string; values: unknown[] } {
  let index = 0;
  const values: unknown[] = [];
  const text = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|\?/g, (token) => {
    if (token !== '?') return token;
    if (index >= params.length) throw new Error('Missing SQL parameter');
    const value = params[index++];
    if (Array.isArray(value)) {
      if (!value.length) throw new Error('Empty SQL parameter list');
      return value.map((item) => { values.push(item); return `$${values.length}`; }).join(',');
    }
    values.push(value);
    return `$${values.length}`;
  });
  if (index !== params.length) throw new Error('Unexpected SQL parameters');
  return { text, values };
}
