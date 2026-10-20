import api from "@/lib/axios";
import { unwrapResponse, type ApiEnvelope } from "@/lib/axios/types";

export type ContentStatItem = {
    type: "news" | "activities" | "blog" | "prayer-rooms";
    id: string;
    title: string;
    totalViews: number;
    createdAt: string | null;
    href: string;
    state: string;
    rangeViews: number;
    prevViews: number;
    series: number[];
};

export type ContentStats = {
    days: string[];
    total: number[];
    byType: Record<string, number[]>;
    rangeTotal: number;
    prevTotal: number;
    change: number | null;
    items: ContentStatItem[];
};

export const fetchContentStats = async (days: number) => unwrapResponse(await api.get<ApiEnvelope<ContentStats>>(`/stats/content?days=${days}`));
