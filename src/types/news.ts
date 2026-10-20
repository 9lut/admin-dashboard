export interface News {
    _id: string;
    name: string;
    description: string;
    date: string; // ISO Date string
    images: string[];
    link?: string;
    /** 'draft' | 'published' (ไม่มี = เผยแพร่แล้ว) */
    status?: string | null;
    /** เวลาเผยแพร่ที่ตั้งไว้ */
    publishAt?: string | null;
    source?: string | null;
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

export interface NewsFormData {
    name: string;
    description: string;
    date: string;
    images?: (string | File)[];
    link?: string;
}
