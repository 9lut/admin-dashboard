import api from "@/lib/axios";
import { PrayerRoom } from "@/types/prayer-room";

import { createFormDataForUpdate } from '@/lib/api-utils';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export const prayerRoomService = {
    getAll: async () => {
        const response = await api.get<ApiEnvelope<PrayerRoom[]>>("/prayer-rooms/");
        return unwrapResponse(response);
    },

    getById: async (id: string) => {
        const response = await api.get<ApiEnvelope<PrayerRoom>>(`/prayer-rooms/${id}?admin=1`);
        return unwrapResponse(response);
    },

    create: async (data: FormData) => {
        const response = await api.post<ApiEnvelope<PrayerRoom>>("/prayer-rooms/", data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return unwrapResponse(response);
    },

    update: async (id: string, data: any, newImages?: File[], deletedImageUrls?: string[]) => {
        const formData = createFormDataForUpdate(data, newImages, deletedImageUrls);
        const response = await api.put<ApiEnvelope<PrayerRoom>>(`/prayer-rooms/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return unwrapResponse(response);
    },

    delete: async (id: string) => {
        const response = await api.delete<ApiEnvelope<null>>(`/prayer-rooms/${id}`);
        return unwrapResponse(response);
    },
};
