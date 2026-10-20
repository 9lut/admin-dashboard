import 'server-only';
import { col, mapDoc, mapQuery, Timestamp, FieldValue } from '../firebase/firestore';
import { matchesLog, type LogDoc, type LogFilter } from '../logs/filter';
export { resourceKey } from '../logs/filter';

export type LogSearch = LogFilter & {
    since?: Date;
    until?: Date;
    order?: 'asc' | 'desc';
    /** id ของเอกสารสุดท้ายจากหน้าก่อน */
    cursor?: string;
    limit?: number;
};

const COLLECTION = 'systemLogs';

const SCAN_CHUNK = 300;
const MAX_SCAN = 3000;

/** Group logs by YYYY-MM-DD, returning [{ _id: date, count }] sorted ascending. */
function groupByDay(rows: { createdAt?: string }[]): { _id: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const r of rows) {
        if (!r.createdAt) continue;
        const day = new Date(r.createdAt).toISOString().slice(0, 10);
        counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return [...counts.entries()].map(([_id, count]) => ({ _id, count })).sort((a, b) => a._id.localeCompare(b._id));
}

export type CreateSystemLog = {
    action: string;
    resource: string;
    resourceId?: string;
    userId?: string;
    role?: string;
    details?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
};

export const systemLogRepo = {
    async create(dto: CreateSystemLog) {
        // createdAt is a real field so a Firestore TTL policy (180d) can target it.
        await col(COLLECTION).add({ ...dto, createdAt: FieldValue.serverTimestamp() });

        // Data Aggregation: Increment counters for dashboard charts
        const today = new Date().toISOString().slice(0, 10);
        const action = dto.action || 'UNKNOWN';
        const updates: any = {
            date: today,
            [`actions.${action}`]: FieldValue.increment(1)
        };
        if (action === 'LOGIN') {
            updates.logins = FieldValue.increment(1);
        }
        
        // Update the daily aggregate document directly (only consumes 1 write per log)
        await col('dailyStats').doc(today).set(updates, { merge: true });
    },

    /**
     * ค้นหา/กรองฝั่ง server แบบไล่อ่านทีละชุดตามเวลา (ใช้แค่ index ของ createdAt — ไม่ต้องสร้าง composite index)
     * หยุดเมื่อได้ครบ limit หรืออ่านเกิน MAX_SCAN ต่อคำขอ แล้วคืน cursor ให้หน้าถัดไปอ่านต่อ
     */
    async search(o: LogSearch) {
        const limit = Math.min(Math.max(o.limit ?? 50, 1), 100);
        const order = o.order ?? 'desc';
        let base = col(COLLECTION) as FirebaseFirestore.Query;
        if (o.since) base = base.where('createdAt', '>=', Timestamp.fromDate(o.since));
        if (o.until) base = base.where('createdAt', '<=', Timestamp.fromDate(o.until));
        base = base.orderBy('createdAt', order);

        const totalInRange = (await base.count().get()).data().count;

        let after: FirebaseFirestore.DocumentSnapshot | undefined;
        if (o.cursor) {
            const snap = await col(COLLECTION).doc(o.cursor).get();
            if (snap.exists) after = snap;
        }

        const rows: Record<string, unknown>[] = [];
        let scanned = 0;
        let nextCursor: string | null = null;
        let exhausted = false;
        while (rows.length < limit && scanned < MAX_SCAN) {
            let q = base.limit(SCAN_CHUNK);
            if (after) q = q.startAfter(after);
            const snap = await q.get();
            if (snap.empty) {
                exhausted = true;
                break;
            }
            let consumedAll = true;
            for (let i = 0; i < snap.docs.length; i++) {
                const doc = snap.docs[i];
                scanned++;
                after = doc;
                if (matchesLog(doc.data() as LogDoc, o)) {
                    rows.push(mapDoc(doc));
                    if (rows.length >= limit) {
                        consumedAll = i === snap.docs.length - 1;
                        break;
                    }
                }
            }
            // ชุดสุดท้ายที่สั้นกว่าปกติและอ่านครบทุกตัว = ไม่มีข้อมูลเหลือแล้ว
            if (snap.size < SCAN_CHUNK && consumedAll) {
                exhausted = true;
                break;
            }
        }
        if (!exhausted && after) nextCursor = after.id;
        return { rows, nextCursor, scanned, totalInRange };
    },

    async findAll(limit = 100) {
        return mapQuery(col(COLLECTION).orderBy('createdAt', 'desc').limit(limit));
    },

    async getRecentLogs(limit = 10) {
        return mapQuery(col(COLLECTION).orderBy('createdAt', 'desc').limit(limit));
    },

    async getRecentLogsPage(page = 1, limit = 10) {
        const offset = Math.max(page - 1, 0) * limit;
        const [rows, total] = await Promise.all([
            mapQuery(col(COLLECTION).orderBy('createdAt', 'desc').offset(offset).limit(limit)),
            col(COLLECTION).count().get().then((snap: any) => snap.data().count),
        ]);
        return { rows, total };
    },

    // Firestore allows an inequality on only one field, so we range-filter on
    // date and sum up the aggregated values.
    async getSystemActivity(startDate?: string, endDate?: string) {
        let query: any = col('dailyStats');
        if (startDate) query = query.where('date', '>=', new Date(startDate).toISOString().slice(0, 10));
        else {
            const limit = new Date();
            limit.setDate(limit.getDate() - 14);
            query = query.where('date', '>=', limit.toISOString().slice(0, 10));
        }
        if (endDate) query = query.where('date', '<=', new Date(endDate).toISOString().slice(0, 10));
        
        const snap = await query.get();
        return snap.docs.map((d: any) => {
            const data = d.data();
            const actions = data.actions || {};
            let count = 0;
            for (const [k, v] of Object.entries(actions)) {
                if (k !== 'LOGIN') count += (v as number);
            }
            return { _id: d.id, count };
        }).sort((a: { _id: string }, b: { _id: string }) => a._id.localeCompare(b._id));
    },

    async getLoginActivity(startDate?: string, endDate?: string) {
        let query: any = col('dailyStats');
        if (startDate) query = query.where('date', '>=', new Date(startDate).toISOString().slice(0, 10));
        else {
            const limit = new Date();
            limit.setDate(limit.getDate() - 7);
            query = query.where('date', '>=', limit.toISOString().slice(0, 10));
        }
        if (endDate) query = query.where('date', '<=', new Date(endDate).toISOString().slice(0, 10));
        
        const snap = await query.get();
        return snap.docs.map((d: any) => ({
            _id: d.id,
            count: d.data().logins || 0
        })).sort((a: { _id: string }, b: { _id: string }) => a._id.localeCompare(b._id));
    },

    async getActionDistribution(startDate?: string, endDate?: string) {
        let query: any = col('dailyStats');
        if (startDate) query = query.where('date', '>=', new Date(startDate).toISOString().slice(0, 10));
        else {
            const limit = new Date();
            limit.setDate(limit.getDate() - 30);
            query = query.where('date', '>=', limit.toISOString().slice(0, 10));
        }
        if (endDate) query = query.where('date', '<=', new Date(endDate).toISOString().slice(0, 10));
        
        const snap = await query.get();
        const counts = new Map<string, number>();
        snap.docs.forEach((d: any) => {
            const actions = d.data().actions || {};
            for (const [k, v] of Object.entries(actions)) {
                counts.set(k, (counts.get(k) || 0) + (v as number));
            }
        });
        return [...counts.entries()].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count);
    },
};
