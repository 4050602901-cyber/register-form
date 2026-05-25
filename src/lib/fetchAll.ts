/**
 * Paginated fetch — bypasses Supabase free-tier row caps by calling .range()
 * in batches of 1000 until exhausted.
 *
 * Usage:
 *   const students = await fetchAll<StudentRow>(([from, to]) =>
 *     supabase.from('students').select(SELECT).order('classroom').range(from, to)
 *   );
 */
export async function fetchAll<T>(
  build: (range: [number, number]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const BATCH = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await build([from, from + BATCH - 1]);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < BATCH) break;
  }
  return all;
}
