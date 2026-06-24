// Formatea el intervalo (en días) hasta el próximo repaso, para mostrarlo por cada cerebro
// ("verde → 6 días"). Puro. En aprendizaje el intervalo es < 1 día (minutos); se resume como "<1 día".

export function formatInterval(days: number): string {
  if (days <= 0) {
    return '<1 día';
  }
  if (days === 1) {
    return '1 día';
  }
  if (days < 30) {
    return `${days} días`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 mes' : `${months} meses`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? '1 año' : `${years} años`;
}
