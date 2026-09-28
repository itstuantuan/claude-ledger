type Page<T> = { items: T[]; page: number; pageSize: number; total: number };

export async function collectPages<T>(fetchPage: (page: number) => Promise<Page<T>>): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (true) {
    const result = await fetchPage(page);
    items.push(...result.items);
    if (result.page * result.pageSize >= result.total) return items;
    if (result.page !== page || result.pageSize <= 0 || result.items.length === 0) {
      throw new Error('材料列表分页异常，请重新加载。');
    }
    page++;
  }
}
