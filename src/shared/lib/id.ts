/** Time-sortable unique id generated on device (no server). */
export function newId(): string {
  const time = Date.now().toString(36).padStart(9, '0');
  let rand = '';
  for (let i = 0; i < 12; i++) rand += Math.floor(Math.random() * 36).toString(36);
  return time + rand;
}
