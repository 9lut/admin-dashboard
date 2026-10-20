// ภาพประกอบประจำแบรนด์ MSS (วาด SVG เอง viewBox 120×120) — ใช้แทนไอคอนสำเร็จรูปในการ์ด/เมนู
// วาดผ่าน Illustration.tsx ซึ่งเตรียม gradient ร่วมให้:
//   url(#ID-a) ฟ้าอ่อน→น้ำเงิน · url(#ID-b) น้ำเงินเข้ม · url(#ID-l) แผ่นพื้นอ่อน · url(#ID-g) ทอง · url(#ID-c) แสงเรือง
// "ID" ถูกแทนด้วย id เฉพาะชิ้น จึงใช้ภาพเดียวกันหลายที่ในหน้าเดียวได้

const shadow = '<ellipse cx="60" cy="107" rx="38" ry="5.5" fill="#0f3f7d" opacity=".12"/>';
const edge = "#b6d8f7";

/** พระจันทร์เสี้ยว (ศูนย์กลาง 0,0 รัศมีราว r) */
const crescent = (r: number, fill: string) =>
  `<path d="M${r * 0.35} ${-r} A${r} ${r} 0 1 0 ${r} ${r * 0.45} A${r * 0.78} ${r * 0.78} 0 1 1 ${r * 0.35} ${-r}Z" fill="${fill}"/>`;

/** ดาวประกาย 4 แฉก */
const sparkle = (x: number, y: number, s: number, fill = "url(#ID-g)") =>
  `<path d="M${x} ${y - s}C${x + s * 0.18} ${y - s * 0.18} ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}C${x + s * 0.18} ${y + s * 0.18} ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}C${x - s * 0.18} ${y + s * 0.18} ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}C${x - s * 0.18} ${y - s * 0.18} ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z" fill="${fill}"/>`;

/** เส้นข้อความจำลอง */
const lines = (x: number, y: number, widths: number[], gap = 8, fill = edge) =>
  widths.map((w, i) => `<rect x="${x}" y="${y + i * gap}" width="${w}" height="4" rx="2" fill="${fill}"/>`).join("");

export const illustrations: Record<string, string> = {
  dashboard: `${shadow}
    <rect x="12" y="20" width="88" height="70" rx="12" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M12 32a12 12 0 0 1 12-12h64a12 12 0 0 1 12 12v4H12z" fill="url(#ID-b)"/>
    <circle cx="22" cy="28" r="2.5" fill="#fff" opacity=".7"/><circle cx="30" cy="28" r="2.5" fill="#fff" opacity=".5"/>
    <rect x="22" y="66" width="10" height="16" rx="3" fill="url(#ID-a)"/>
    <rect x="37" y="56" width="10" height="26" rx="3" fill="url(#ID-a)"/>
    <rect x="52" y="46" width="10" height="36" rx="3" fill="url(#ID-b)"/>
    <circle cx="82" cy="60" r="13" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <path d="M82 60V47a13 13 0 0 1 12.4 9z" fill="url(#ID-g)"/>
    <path d="M82 60l12.4-4A13 13 0 1 1 82 47z" fill="url(#ID-a)" opacity=".85"/>
    ${sparkle(102, 16, 6)}`,

  news: `${shadow}
    <rect x="22" y="18" width="70" height="80" rx="10" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <rect x="12" y="30" width="16" height="64" rx="6" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <rect x="32" y="28" width="50" height="22" rx="5" fill="url(#ID-a)"/>
    <path d="M36 46l10-10 8 7 6-5 10 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    ${lines(32, 58, [50, 42, 50, 30])}
    <g transform="translate(94 26)"><circle r="14" fill="url(#ID-b)"/><path d="M-6-3h8l5-4v14l-5-4h-8z" fill="#fff"/></g>`,

  activities: `${shadow}
    <rect x="14" y="24" width="72" height="72" rx="12" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <path d="M14 36a12 12 0 0 1 12-12h48a12 12 0 0 1 12 12v8H14z" fill="url(#ID-a)"/>
    <rect x="29" y="16" width="6" height="16" rx="3" fill="url(#ID-b)"/><rect x="65" y="16" width="6" height="16" rx="3" fill="url(#ID-b)"/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${23 + c * 15}" y="${52 + r * 13}" width="9" height="8" rx="2.5" fill="${r === 1 && c === 2 ? "url(#ID-b)" : edge}"/>`).join("")).join("")}
    <g transform="translate(92 74)"><circle r="18" fill="url(#ID-g)"/><path d="M0-9l2.6 5.4 5.9.8-4.3 4.1 1 5.8L0 4.3-5.2 7.1l1-5.8-4.3-4.1 5.9-.8z" fill="#fff"/></g>`,

  calendar: `${shadow}
    <rect x="18" y="22" width="84" height="76" rx="12" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <path d="M18 34a12 12 0 0 1 12-12h60a12 12 0 0 1 12 12v10H18z" fill="url(#ID-b)"/>
    <rect x="36" y="14" width="6" height="16" rx="3" fill="url(#ID-a)"/><rect x="78" y="14" width="6" height="16" rx="3" fill="url(#ID-a)"/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => `<circle cx="${32 + c * 14}" cy="${57 + r * 13}" r="4" fill="${r === 2 && c === 1 ? "url(#ID-g)" : r === 0 && c === 3 ? "url(#ID-a)" : edge}"/>`).join("")).join("")}`,

  "prayer-room": `${shadow}
    <circle cx="56" cy="44" r="30" fill="url(#ID-c)"/>
    <rect x="18" y="60" width="64" height="40" rx="6" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M24 62c0-17 12-30 26-32 14 2 26 15 26 32z" fill="url(#ID-a)"/>
    <path d="M38 50c3-8 8-13 12-15" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <rect x="48.6" y="16" width="2.8" height="14" rx="1.4" fill="url(#ID-g)"/>
    <g transform="translate(50 13)">${crescent(5, "url(#ID-g)")}</g>
    <path d="M42 100V84a8 8 0 0 1 16 0v16z" fill="url(#ID-b)"/>
    <path d="M26 80v-5a4 4 0 0 1 8 0v5zM66 80v-5a4 4 0 0 1 8 0v5z" fill="${edge}"/>
    <rect x="88" y="44" width="13" height="56" rx="3" fill="url(#ID-b)"/>
    <path d="M86 46l8.5-17 8.5 17z" fill="url(#ID-a)"/>
    <rect x="85" y="60" width="19" height="4.5" rx="2.2" fill="url(#ID-g)"/>`,

  blog: `${shadow}
    <path d="M60 30c-12-8-30-10-44-6v68c14-4 32-2 44 6z" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <path d="M60 30c12-8 30-10 44-6v68c-14-4-32-2-44 6z" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M60 30v68" stroke="url(#ID-b)" stroke-width="3"/>
    ${lines(24, 40, [28, 22, 28, 18], 9)}
    ${lines(68, 40, [28, 24, 28], 9)}
    <g transform="rotate(35 88 70)"><rect x="83" y="40" width="10" height="44" rx="3" fill="url(#ID-a)"/><path d="M83 84h10l-5 10z" fill="url(#ID-b)"/><rect x="83" y="40" width="10" height="7" rx="2" fill="url(#ID-g)"/></g>`,

  users: `${shadow}
    <circle cx="80" cy="44" r="13" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M58 92c0-15 10-26 22-26s22 11 22 26z" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <circle cx="48" cy="40" r="17" fill="url(#ID-a)"/>
    <path d="M18 98c0-20 13-34 30-34s30 14 30 34z" fill="url(#ID-b)"/>
    <path d="M40 34c2-5 6-8 11-8" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    ${sparkle(100, 20, 6)}`,

  permissions: `${shadow}
    <path d="M60 12l38 14v26c0 25-16 42-38 52-22-10-38-27-38-52V26z" fill="url(#ID-a)"/>
    <path d="M60 22l28 10v20c0 19-12 32-28 40z" fill="#fff" opacity=".18"/>
    <rect x="44" y="52" width="32" height="26" rx="6" fill="#fff"/>
    <path d="M50 52v-6a10 10 0 0 1 20 0v6" stroke="#fff" stroke-width="5" fill="none"/>
    <circle cx="60" cy="63" r="4" fill="url(#ID-b)"/><rect x="58" y="64" width="4" height="8" rx="2" fill="url(#ID-b)"/>
    ${sparkle(102, 22, 6)}`,

  contact: `${shadow}
    <circle cx="60" cy="54" r="40" fill="url(#ID-c)"/>
    <path d="M60 84S28 66 28 44c0-10 8-18 17-18 7 0 12 4 15 9 3-5 8-9 15-9 9 0 17 8 17 18 0 22-32 40-32 40z" fill="url(#ID-a)"/>
    <path d="M40 40c1-5 4-8 8-9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <path d="M14 90c10-8 22-10 32-6l14 5c4 1 4 7-1 7H44" fill="none" stroke="url(#ID-b)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M58 96l22-8c6-2 11 0 13 3" fill="none" stroke="url(#ID-b)" stroke-width="6" stroke-linecap="round"/>
    ${sparkle(98, 22, 6)}`,

  settings: `${shadow}
    <g transform="translate(54 58)">
      ${Array.from({ length: 8 }, (_, i) => `<rect x="-6" y="-38" width="12" height="16" rx="3" fill="url(#ID-b)" transform="rotate(${i * 45})"/>`).join("")}
      <circle r="27" fill="url(#ID-a)"/><circle r="11" fill="#fff"/><circle r="5" fill="url(#ID-b)"/>
    </g>
    <g transform="translate(94 30)"><circle r="14" fill="#fff" stroke="${edge}" stroke-width="2"/><path d="M-6 0l4 4 8-8" stroke="url(#ID-b)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,

  logs: `${shadow}
    <rect x="20" y="14" width="66" height="86" rx="10" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <rect x="38" y="9" width="30" height="12" rx="5" fill="url(#ID-b)"/>
    ${[0, 1, 2, 3].map((i) => `<circle cx="34" cy="${38 + i * 15}" r="4.5" fill="${i === 0 ? "url(#ID-g)" : "url(#ID-a)"}"/><rect x="44" y="${36 + i * 15}" width="${[30, 24, 30, 18][i]}" height="4" rx="2" fill="${edge}"/>`).join("")}
    <g transform="translate(88 82)"><circle r="17" fill="url(#ID-b)"/><circle r="11" fill="#fff"/><path d="M0-6v6l4 3" stroke="url(#ID-b)" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,

  profile: `${shadow}
    <rect x="16" y="22" width="88" height="70" rx="12" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <circle cx="44" cy="50" r="13" fill="url(#ID-a)"/>
    <path d="M24 82c0-12 9-20 20-20s20 8 20 20z" fill="url(#ID-b)"/>
    ${lines(70, 44, [24, 18, 24], 10)}
    <g transform="translate(96 26)"><circle r="12" fill="url(#ID-g)"/><path d="M-5 0l3.5 3.5L5.5-4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,

  analytics: `${shadow}
    <rect x="14" y="20" width="92" height="76" rx="12" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <path d="M24 80l18-20 14 10 20-24 20 12" stroke="url(#ID-a)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 80l18-20 14 10 20-24 20 12V86H24z" fill="url(#ID-a)" opacity=".15"/>
    <circle cx="76" cy="46" r="6" fill="#fff" stroke="url(#ID-b)" stroke-width="3.5"/>
    ${lines(24, 30, [30, 18], 8)}
    ${sparkle(100, 16, 6)}`,

  security: `${shadow}
    <circle cx="60" cy="54" r="42" fill="url(#ID-c)"/>
    <rect x="30" y="50" width="60" height="48" rx="12" fill="url(#ID-a)"/>
    <path d="M42 50V38a18 18 0 0 1 36 0v12" stroke="url(#ID-b)" stroke-width="8" fill="none"/>
    <circle cx="60" cy="70" r="7" fill="#fff"/><rect x="57" y="72" width="6" height="14" rx="3" fill="#fff"/>
    ${sparkle(98, 24, 6)}`,

  welcome: `
    <circle cx="60" cy="56" r="46" fill="#fff" opacity=".12"/>
    <circle cx="60" cy="56" r="32" fill="#fff" opacity=".12"/>
    <rect x="14" y="70" width="92" height="34" rx="5" fill="#fff"/>
    <path d="M30 72c0-18 13-32 30-34 17 2 30 16 30 34z" fill="url(#ID-l)"/>
    <path d="M44 56c3-8 9-13 15-15" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <rect x="58.6" y="20" width="2.8" height="18" rx="1.4" fill="url(#ID-g)"/>
    <g transform="translate(60 17)">${crescent(6, "url(#ID-g)")}</g>
    <rect x="8" y="46" width="11" height="58" rx="3" fill="#fff"/><path d="M6 48l7.5-16 7.5 16z" fill="url(#ID-l)"/>
    <rect x="101" y="46" width="11" height="58" rx="3" fill="#fff"/><path d="M99 48l7.5-16 7.5 16z" fill="url(#ID-l)"/>
    <rect x="6" y="62" width="15" height="4" rx="2" fill="url(#ID-g)"/><rect x="99" y="62" width="15" height="4" rx="2" fill="url(#ID-g)"/>
    <path d="M51 104V88a9 9 0 0 1 18 0v16z" fill="url(#ID-b)"/>
    ${[26, 38, 78, 90].map((x) => `<path d="M${x} 94v-6a4 4 0 0 1 8 0v6z" fill="#b6d8f7"/>`).join("")}
    ${sparkle(100, 18, 5, "#fff")}${sparkle(20, 26, 4, "#fff")}`,

  "prayer-times": `${shadow}
    <circle cx="56" cy="60" r="41" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <circle cx="56" cy="60" r="32" fill="#fff"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="54.6" y="31" width="2.8" height="${i % 3 ? 4 : 7}" rx="1.4" fill="${i % 3 ? edge : "#1468c2"}" transform="rotate(${i * 30} 56 60)"/>`).join("")}
    <path d="M56 60V39" stroke="url(#ID-b)" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 60l15 9" stroke="url(#ID-a)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="56" cy="60" r="5.5" fill="url(#ID-b)"/><circle cx="56" cy="60" r="2" fill="#fff"/>
    <g transform="translate(93 27)"><circle r="17" fill="#fff" stroke="#fde8b0" stroke-width="2"/>${crescent(10, "url(#ID-g)")}</g>
    ${sparkle(18, 26, 6)}`,

  stock: `${shadow}
    <path d="M60 18l40 18v44L60 100 20 80V36z" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M20 36l40 18 40-18" fill="none" stroke="${edge}" stroke-width="2"/>
    <path d="M60 54v46L20 80V36z" fill="url(#ID-a)"/>
    <path d="M60 54v46l40-20V36z" fill="url(#ID-b)"/>
    <path d="M40 27l40 18v14l-8 4V49L32 31z" fill="url(#ID-g)"/>
    <path d="M30 62l20 9" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    ${sparkle(102, 18, 6)}`,

  gallery: `${shadow}
    <rect x="30" y="14" width="66" height="54" rx="9" fill="url(#ID-l)" stroke="${edge}" stroke-width="2" transform="rotate(8 63 41)"/>
    <rect x="16" y="30" width="76" height="62" rx="10" fill="#fff" stroke="${edge}" stroke-width="2"/>
    <rect x="23" y="37" width="62" height="40" rx="6" fill="url(#ID-l)"/>
    <path d="M23 71l17-17 12 11 9-8 24 18v2a6 6 0 0 1-6 6H29a6 6 0 0 1-6-6z" fill="url(#ID-a)"/>
    <circle cx="71" cy="48" r="6" fill="url(#ID-g)"/>
    <rect x="23" y="82" width="34" height="4" rx="2" fill="${edge}"/>
    ${sparkle(102, 24, 6)}`,

  trash: `${shadow}
    <rect x="26" y="34" width="60" height="64" rx="9" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <rect x="20" y="24" width="72" height="12" rx="6" fill="url(#ID-b)"/>
    <rect x="46" y="16" width="20" height="10" rx="4" fill="url(#ID-a)"/>
    ${[40, 56, 72].map((x) => `<rect x="${x - 2.5}" y="46" width="5" height="40" rx="2.5" fill="${edge}"/>`).join("")}
    <g transform="translate(92 80)"><circle r="16" fill="url(#ID-a)"/><path d="M-6 0a6 6 0 1 0 2-4.5M-5-8v4h4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,

  empty: `${shadow}
    <path d="M20 58l12-30h56l12 30v34a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8z" fill="url(#ID-l)" stroke="${edge}" stroke-width="2"/>
    <path d="M20 58h24l4 10h24l4-10h24" fill="none" stroke="${edge}" stroke-width="2"/>
    <path d="M20 58h24l4 10h24l4-10h24v34a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8z" fill="url(#ID-a)" opacity=".9"/>
    ${sparkle(30, 18, 5)}${sparkle(94, 22, 6, "url(#ID-a)")}`,
};
