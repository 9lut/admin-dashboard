import api from "@/lib/axios";
import { News } from "@/types/news";
import { createFormDataForUpdate } from '@/lib/api-utils';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export const newsService = {
    getAll: async () => {
        const response = await api.get<ApiEnvelope<News[]>>("/news/?admin=1");
        return unwrapResponse(response);
    },

    getById: async (id: string) => {
        const response = await api.get<ApiEnvelope<News>>(`/news/${id}?admin=1`);
        return unwrapResponse(response);
    },

    create: async (data: FormData) => {
        const response = await api.post<ApiEnvelope<News>>("/news/", data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return unwrapResponse(response);
    },

    update: async (id: string, data: any, newImages?: File[], deletedImageUrls?: string[]) => {
        const formData = createFormDataForUpdate(data, newImages, deletedImageUrls);
        const response = await api.patch<ApiEnvelope<News>>(`/news/${id}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return unwrapResponse(response);
    },

    delete: async (id: string) => {
        const response = await api.delete<ApiEnvelope<null>>(`/news/${id}`);
        return unwrapResponse(response);
    },
};
