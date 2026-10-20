export interface Activity {
    _id: string;
    name_th: string;
    name_eng: string;
    location: string;
    participants?: number;
    duration?: number;
    description: string;
    images: string[];
    objectives?: string[];
    goals?: string[];
    start_date: string;
    end_date: string;
    feedbacks?: string[];
    favorite: boolean;
    status?: string | null;
    publishAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface ActivityListItem {
    _id: string;
    name_th: string;
    name_eng: string;
    location: string;
    description: string;
    favorite: boolean;
    images: string | null; // List API returns single string
    slug?: string;
    status?: string | null;
    publishAt?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    createdAt?: string | null;
}

export interface ActivityResponse<T> {
    status: string;
    data: T;
}

export interface CreateActivityData {
    name_th: string;
    name_eng: string;
    location: string;
    participants?: number;
    duration?: number;
    description: string;
    images?: string[]; 
    objectives?: string[];
    goals?: string[];
    start_date: string;
    end_date: string;
    favorite?: boolean;
}

export interface UpdateActivityData extends Partial<CreateActivityData> {}
