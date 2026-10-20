import { useId } from "react";
import { illustrations } from "./illustrations";

export type ArtName = keyof typeof illustrations;

/**
 * ภาพประกอบเวกเตอร์ประจำแบรนด์ MSS (SVG จาก illustrations.ts)
 * ตกแต่งอย่างเดียวโดยปริยาย · ใส่ title เมื่อภาพสื่อความหมายเอง
 * id ของ gradient ต่อชิ้นไม่ซ้ำ — ภาพที่ซ่อนอยู่จะไม่ทำให้ภาพอื่นในหน้าเสียสี
 */
export function Illustration({ name, className = "size-16", title }: { name: string; className?: string; title?: string }) {
  const uid = `il${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const body = illustrations[name];
  if (!body) return null;

  const html = `<defs>
  <linearGradient id="${uid}-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5cc0f2"/><stop offset="1" stop-color="#1468c2"/></linearGradient>
  <linearGradient id="${uid}-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f3f7d"/><stop offset="1" stop-color="#1468c2"/></linearGradient>
  <linearGradient id="${uid}-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7fbff"/><stop offset="1" stop-color="#e3effc"/></linearGradient>
  <linearGradient id="${uid}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8cf62"/><stop offset="1" stop-color="#e59a2f"/></linearGradient>
  <radialGradient id="${uid}-c"><stop offset="0" stop-color="#5cc0f2" stop-opacity=".4"/><stop offset="1" stop-color="#5cc0f2" stop-opacity="0"/></radialGradient>
</defs>${body.replaceAll("#ID-", `#${uid}-`)}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
