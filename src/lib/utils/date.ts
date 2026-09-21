import { format, isValid, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
export function formatDate(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'yyyy年M月d日', { locale: zhCN }) : '—';
}
