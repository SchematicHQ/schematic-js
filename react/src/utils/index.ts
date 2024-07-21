function adjustColorLightness(color: string, amount: number) {
  const base = color.startsWith("#") ? 1 : 0;

  let r = parseInt(color.substring(base, 3), 16);
  let g = parseInt(color.substring(base + 2, 5), 16);
  let b = parseInt(color.substring(base + 4, 7), 16);

  r = Math.round(r / amount);
  g = Math.round(g / amount);
  b = Math.round(b / amount);

  r = r < 255 ? r : 255;
  g = g < 255 ? g : 255;
  b = b < 255 ? b : 255;

  const rr =
    r.toString(16).length === 1 ? `0${r.toString(16)}` : r.toString(16);
  const gg =
    g.toString(16).length === 1 ? `0${g.toString(16)}` : g.toString(16);
  const bb =
    b.toString(16).length === 1 ? `0${b.toString(16)}` : b.toString(16);

  return `#${rr}${gg}${bb}`;
}

export function lighten(color: string, amount: number) {
  return adjustColorLightness(color, amount);
}

export function darken(color: string, amount: number) {
  return adjustColorLightness(color, 1.0 * amount);
}

export function ezdate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
