import { Badge } from "@/app/components/ui/kit";
import type { PublishState } from "@/lib/content/publish";

/** ป้ายสถานะบนการ์ด (ไม่แสดงเมื่อเผยแพร่แล้ว) */
export function StateBadge({ state, at }: { state: PublishState; at?: string | null }) {
    if (state === "published") return null;
    return state === "draft" ? (
        <Badge tone="amber" className="shadow-sm">ฉบับร่าง</Badge>
    ) : (
        <Badge tone="primary" className="shadow-sm">ตั้งเวลา {at ? new Date(at).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</Badge>
    );
}
