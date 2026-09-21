const decimalPattern = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
export function toMinorUnits(value: string): bigint {
  const match = decimalPattern.exec(value);
  if (!match) throw new Error('金额必须是最多两位小数的十进制字符串');
  return (match[1] ? -1n : 1n) * (BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0')));
}
export function fromMinorUnits(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function formatMoney(value: string): string {
  const normalized = fromMinorUnits(toMinorUnits(value));
  const [integer, fraction] = normalized.replace('-', '').split('.');
  return `${normalized.startsWith('-') ? '-' : ''}¥${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}
