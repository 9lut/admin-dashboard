"use client";
import { RevisionHistory } from "@/app/components/content/RevisionHistory";
import { FormSkeleton } from "@/app/components/ui/FormSkeleton";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { blogService } from "@/services/blogService";
import { BlogGroup } from "@/types/blog";
import { useToast } from "@/hooks/use-toast";
import BlogForm from "../../../components/BlogForm";

export default function EditBlogPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const [initializing, setInitializing] = useState(true);
    const [groups, setGroups] = useState<BlogGroup[]>([]);
    const [blogData, setBlogData] = useState<any>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const slug = params.slug as string;

                if (!slug) {
                    toast({ title: "ผิดพลาด", description: "ไม่พบ slug ของบทความ", variant: "destructive" });
                    router.push('/admin/blog/content');
                    return;
                }

                const [groupsData, blog] = await Promise.all([
                    blogService.getGroups(),
                    blogService.getBySlug(slug)
                ]);

                setGroups(groupsData || []);

                if (blog) {
                    // Handle group: could be string or object
                    const groupId = typeof blog.group === 'string' ? blog.group : blog.group?._id || "";

                    // Handle content format
                    let processedContent = blog.content;
                    if (Array.isArray(blog.content)) {
                        processedContent = blog.content;
                    } else if (typeof blog.content === 'string') {
                        // Legacy support: Wrap string content in a paragraph block
                        processedContent = [{ type: 'paragraph', data: blog.content }];
                    }

                    setBlogData({
                        id: blog._id,
                        title: blog.title,
                        slug: blog.slug || "",
                        description: blog.description || "",
                        group: groupId,
                        tags: blog.tags || [],
                        coverImage: blog.coverImage || "",
                        content: processedContent,
                        status: blog.status || 'draft',
                        views: blog.views || 0
                    });
                } else {
                    toast({ title: "ผิดพลาด", description: "ไม่พบบทความที่ต้องการแก้ไข", variant: "destructive" });
                    router.push('/admin/blog/content');
                }
            } catch (error) {
                console.error("Failed to load data", error);
                toast({ title: "ผิดพลาด", description: "ไม่สามารถโหลดข้อมูลบทความได้", variant: "destructive" });
                router.push('/admin/blog/content');
            } finally {
                setInitializing(false);
            }
        };

        loadData();
    }, [params.slug, router, toast]);

    const handleGroupCreated = (newGroup: BlogGroup) => {
        setGroups(prev => [...prev, newGroup]);
    };

    const handleSubmit = async (updatedData: any) => {
        try {
            await blogService.update(blogData.id, updatedData);
            toast({ title: "สำเร็จ", description: "แก้ไขบทความเรียบร้อยแล้ว", variant: "default" });
            router.push('/admin/blog/content');
        } catch (error: any) {
            console.error("Update blog error:", error);
            const errorMsg = error?.response?.data?.message || error?.message || "ไม่สามารถบันทึกการแก้ไขได้";
            toast({ title: "ผิดพลาด", description: errorMsg, variant: "destructive" });
            throw error; // Re-throw to let BlogForm handle loading state
        }
    };

    const handleCancel = () => {
        router.push('/admin/blog/content');
    };

    if (initializing) {
        return <FormSkeleton />;
    }

    if (!blogData) {
        return null;
    }

    return (
        <div className="space-y-5">
            <BlogForm
                mode="edit"
                initialData={blogData}
                groups={groups}
                onGroupCreated={handleGroupCreated}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
            />
            <RevisionHistory type="blog" id={blogData.id} />
        </div>
    );
}
