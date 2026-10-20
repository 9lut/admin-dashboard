import api from '@/lib/axios';

import { Activity, ActivityListItem } from '@/types/activity';

import { createFormDataForUpdate } from '@/lib/api-utils';
import { ApiEnvelope, unwrapResponse } from '@/lib/axios/types';

export const activityService = {
    getAll: async () => {
        const response = await api.get<ApiEnvelope<ActivityListItem[]>>('/activities/?admin=1');
        return unwrapResponse(response);
    },

    getById: async (id: string) => {
        const response = await api.get<ApiEnvelope<Activity>>(`/activities/${id}?admin=1`);
        return unwrapResponse(response);
    },

    create: async (data: FormData) => {
        const response = await api.post<ApiEnvelope<Activity>>('/activities/', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return unwrapResponse(response);
    },

    update: async (id: string, data: any, newImages?: File[], deletedImageUrls?: string[]) => {
        const formData = createFormDataForUpdate(data, newImages, deletedImageUrls);
        const response = await api.patch<ApiEnvelope<Activity>>(`/activities/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return unwrapResponse(response);
    },

    delete: async (id: string) => {
        const response = await api.delete(`/activities/${id}`);
        return unwrapResponse(response);
    },

    getRoadmap: async () => {
        const response = await api.get<ApiEnvelope<Activity[]>>('/activities/roadmap');
        return unwrapResponse(response);
    }
};
