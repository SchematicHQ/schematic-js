export function hexToHSL(color: string) {
  let r = 0;
  let g = 0;
  let b = 0;

  if (color.length == 4) {
    r = parseInt("0x" + color[1] + color[1]);
    g = parseInt("0x" + color[2] + color[2]);
    b = parseInt("0x" + color[3] + color[3]);
  } else if (color.length == 7) {
    r = parseInt("0x" + color[1] + color[2]);
    g = parseInt("0x" + color[3] + color[4]);
    b = parseInt("0x" + color[5] + color[6]);
  }

  r /= 255;
  g /= 255;
  b /= 255;

  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;

  let h = 0;
  let s = 0;
  let l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

export function hslToHex({ h, s, l }: { h: number; s: number; l: number }) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  let rs = Math.round((r + m) * 255).toString(16);
  let gs = Math.round((g + m) * 255).toString(16);
  let bs = Math.round((b + m) * 255).toString(16);

  if (rs.length == 1) rs = "0" + rs;
  if (gs.length == 1) gs = "0" + gs;
  if (bs.length == 1) bs = "0" + bs;

  return "#" + rs + gs + bs;
}

export function adjustColorLightness(color: string, amount: number) {
  const { h, s, l } = hexToHSL(color);
  return hslToHex({ h, s, l: Math.max(Math.min(l + amount, 100), 0) });
}

export function lighten(color: string, amount: number) {
  return adjustColorLightness(color, amount);
}

export function darken(color: string, amount: number) {
  return adjustColorLightness(color, -amount);
}

export function ezdate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
