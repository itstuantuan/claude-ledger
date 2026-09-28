export const STORE_TIME_ZONE = 'Asia/Shanghai';

const parts = (value: string | Date, includeTime = false) => {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: STORE_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
  };
  const values = new Map(new Intl.DateTimeFormat('en-CA', options).formatToParts(new Date(value)).map((item) => [item.type, item.value]));
  return {
    year: values.get('year')!, month: values.get('month')!, day: values.get('day')!,
    hour: values.get('hour') || '00', minute: values.get('minute') || '00',
  };
};

export function formatStoreDate(value: string | Date) {
  const p = parts(value);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatStoreDateTime(value: string | Date) {
  const p = parts(value, true);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

export function formatStoreTime(value: string | Date) {
  const p = parts(value, true);
  return `${p.hour}:${p.minute}`;
}

export function storeDateTimeInput(value: string | Date = new Date()) {
  const p = parts(value, true);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function storeDateInput(value: string | Date = new Date()) {
  return formatStoreDate(value);
}

export function toApiDateTime(value: string) {
  const trimmed = value.trim();
  const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;
  if (localDateTime.test(trimmed)) return new Date(`${trimmed}+08:00`).toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00+08:00`).toISOString();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new Error('时间格式不正确');
  return parsed.toISOString();
}
