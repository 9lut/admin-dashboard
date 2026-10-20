import "server-only";
import {
  col,
  mapDoc,
  timestamps,
  touch,
  Timestamp,
  FieldValue,
} from "../firebase/firestore";
import { NotFound } from "../http/response";
import { deleteFile } from "../storage/r2";

const COLLECTION = "blogs";

type ContentBlock = { type: string; data: unknown };

export type CreateBlog = {
  title: string;
  description?: string;
  content: ContentBlock[];
  tags?: string[];
  author?: string;
  group: string;
  series?: { name: string; order: number } | null;
  referenceUrl?: string;
  slug?: string;
  status?: "draft" | "published";
  coverImage?: string;
};

export type UpdateBlog = Partial<CreateBlog> & { deletedImages?: string[] };

type BlogRaw = {
  title: string;
  description?: string;
  slug: string;
  status: string;
  views?: number;
  createdAt?: string;
  [k: string]: unknown;
};

const PREVIEW_FIELDS = [
  "title",
  "description",
  "tags",
  "createdAt",
  "author",
  "group",
  "series",
  "referenceUrl",
  "coverImage",
  "slug",
  "views",
] as const;

function pick<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
) {
  const out: Record<string, unknown> = { _id: obj._id, id: obj.id };
  for (const k of keys) out[k] = obj[k];
  return out;
}

function generateSlugFromTitle(title: string): string | null {
  const isEnglish = /^[a-zA-Z0-9\s\-_.,!?'"():;&@#%+=/\\]+$/.test(title);
  if (!isEnglish) return null;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const snap = await col(COLLECTION).where("slug", "==", slug).limit(2).get();
  return snap.docs.some((d) => d.id !== excludeId);
}

/** Resolve a blog by Firestore doc id first, then by slug. */
async function resolve(idOrSlug: string) {
  const direct = await col(COLLECTION).doc(idOrSlug).get();
  if (direct.exists) return direct;
  const q = await col(COLLECTION).where("slug", "==", idOrSlug).limit(1).get();
  return q.empty ? null : q.docs[0];
}

async function generateUniqueSlug(
  baseSlug: string,
  excludeId?: string,
): Promise<string> {
  let slug = baseSlug;
  let count = 1;
  while (await isSlugTaken(slug, excludeId)) {
    slug = `${baseSlug}-${count}`;
    count++;
  }
  return slug;
}

async function updateGroups(newGroup?: string) {
  if (!newGroup) return;
  const ref = col("settings").doc("blog_groups");
  await ref.set(
    {
      groups: FieldValue.arrayUnion(newGroup),
    },
    { merge: true },
  );
}

function matchesSearch(b: BlogRaw, search?: string): boolean {
  if (!search) return true;
  const s = search.toLowerCase();
  return (
    (b.title?.toLowerCase().includes(s) ||
      b.description?.toLowerCase().includes(s)) ??
    false
  );
}

function paginate<T>(rows: T[], page: number, limit: number) {
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export const blogRepo = {
  async getGroups() {
    const doc = await col("settings").doc("blog_groups").get();
    return doc.exists ? doc.data()?.groups || [] : [];
  },

  async create(dto: CreateBlog) {
    const ref = col(COLLECTION).doc(); // pre-generate id for slug fallback

    let description = dto.description;
    if (!description && dto.content) {
      const firstParagraph = dto.content.find((b) => b.type === "paragraph");
      if (firstParagraph)
        description = String(firstParagraph.data).substring(0, 150);
    }

    let baseSlug = dto.slug || generateSlugFromTitle(dto.title) || ref.id;
    let slug = await generateUniqueSlug(baseSlug);

    await ref.set({
      title: dto.title,
      description: description ?? "",
      content: dto.content,
      tags: dto.tags ?? [],
      author: dto.author ?? "",
      group: dto.group,
      series: dto.series || null,
      referenceUrl: dto.referenceUrl || "",
      slug,
      status: dto.status ?? "draft",
      coverImage: dto.coverImage ?? "",
      views: 0,
      ...timestamps(),
    });

    await updateGroups(dto.group);
    return mapDoc(await ref.get());
  },

  async findPublicPreview(search: string | undefined, page = 1, limit = 10) {
    const q = col(COLLECTION)
      .where("status", "==", "published")
      .orderBy("createdAt", "desc");
    if (search) {
      const snap = await q.get();
      const rows = snap.docs
        .map((d) => mapDoc<BlogRaw>(d))
        .filter((b) => matchesSearch(b, search))
        .map((b) => pick(b, PREVIEW_FIELDS));
      return paginate(rows, page, limit);
    }

    const snap = await q
      .offset((page - 1) * limit)
      .limit(limit)
      .get();
    const countSnap = await col(COLLECTION)
      .where("status", "==", "published")
      .count()
      .get();
    const total = countSnap.data().count;

    const rows = snap.docs.map((d) => pick(mapDoc<BlogRaw>(d), PREVIEW_FIELDS));
    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findAdminPreview(
    options: {
      search?: string;
      group?: string;
      status?: string;
      month?: string;
      year?: string;
      sortKey?: string;
      sortDir?: "asc" | "desc" | null;
    },
    page = 1,
    limit = 10,
  ) {
    const hasComplexFilters =
      options.search ||
      options.group ||
      options.status ||
      options.month ||
      options.year ||
      options.sortKey;

    const q = col(COLLECTION).orderBy("createdAt", "desc");

    if (hasComplexFilters) {
      // Fetch all and filter in memory since Firestore can't do this without composite indexes
      const snap = await q.get();
      let rows = snap.docs.map((d) => mapDoc<BlogRaw>(d));

      // Apply filters
      rows = rows.filter((b) => {
        if (options.search && !matchesSearch(b, options.search)) return false;
        // เดิมไม่มีวงเล็บ: ตอนไม่ได้กรองกลุ่ม บทความที่ group เป็น object ถูกตัดทิ้งทั้งหมด
        if (options.group) {
          const g = b.group as unknown;
          const match =
            typeof g === "string"
              ? g === options.group
              : (g as { _id?: string; name?: string } | null)?._id === options.group ||
                (g as { _id?: string; name?: string } | null)?.name === options.group;
          if (!match) return false;
        }
        if (options.status && b.status !== options.status) return false;

        if (options.month || options.year) {
          const d = new Date((b as { publishedAt?: string }).publishedAt || b.createdAt || Date.now());
          if (
            options.month &&
            (d.getMonth() + 1).toString().padStart(2, "0") !== options.month
          )
            return false;
          if (options.year && d.getFullYear().toString() !== options.year)
            return false;
        }
        return true;
      });

      // Apply sorting
      if (options.sortKey && options.sortDir) {
        rows.sort((a, b) => {
          const aVal = (a as any)[options.sortKey!] || "";
          const bVal = (b as any)[options.sortKey!] || "";
          if (aVal < bVal) return options.sortDir === "asc" ? -1 : 1;
          if (aVal > bVal) return options.sortDir === "asc" ? 1 : -1;
          return 0;
        });
      }

      const pickedRows = rows.map((b) =>
        pick(b, [...PREVIEW_FIELDS, "status"]),
      );
      return paginate(pickedRows, page, limit);
    }

    // Optimized path for default view (No filters)
    const snap = await q
      .offset((page - 1) * limit)
      .limit(limit)
      .get();
    const countSnap = await col(COLLECTION).count().get();
    const total = countSnap.data().count;

    const rows = snap.docs.map((d) =>
      pick(mapDoc<BlogRaw>(d), [...PREVIEW_FIELDS, "status"]),
    );
    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findOnePublic(idOrSlug: string, incrementView = false) {
    const doc = await resolve(idOrSlug);
    if (!doc || doc.get("status") !== "published")
      throw NotFound(`Blog with id "${idOrSlug}" not found`);
    if (incrementView)
      await doc.ref
        .update({ views: FieldValue.increment(1) })
        .catch(() => undefined);
    return mapDoc(await doc.ref.get());
  },

  async findOneAdmin(idOrSlug: string) {
    const doc = await resolve(idOrSlug);
    if (!doc) throw NotFound(`Blog with id "${idOrSlug}" not found`);
    return mapDoc(doc);
  },

  async update(idOrSlug: string, dto: UpdateBlog) {
    const doc = await resolve(idOrSlug);
    if (!doc) throw NotFound(`Blog with id "${idOrSlug}" not found`);

    const patch: Record<string, unknown> = { ...dto, ...touch() };
    delete patch.deletedImages;

    if (dto.slug) {
      patch.slug = await generateUniqueSlug(dto.slug, doc.id);
    }
    await doc.ref.update(patch);
    await updateGroups(dto.group);

    // ไม่ลบไฟล์รูปที่เอาออกทันที (ประวัติการแก้ไขย้อนกลับได้) — จัดการที่ "คลังรูป"

    return mapDoc(await doc.ref.get());
  },

  async delete(idOrSlug: string) {
    const doc = await resolve(idOrSlug);
    if (!doc) throw NotFound(`Blog with id "${idOrSlug}" not found`);
    const data = doc.data();
    if (!data) return;

    const tasks: Promise<void>[] = [];
    if (data.coverImage) {
      tasks.push(
        deleteFile(data.coverImage).catch((err) =>
          console.error("Failed to delete coverImage:", err),
        ),
      );
    }
    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        if (block.type === "image" && block.data?.url) {
          tasks.push(
            deleteFile(block.data.url).catch((err) =>
              console.error("Failed to delete content image:", err),
            ),
          );
        }
      }
    }
    await Promise.all(tasks);

    await doc.ref.delete();
  },

  async countAll(startDate?: string, endDate?: string) {
    let query: any = col(COLLECTION);
    if (startDate)
      query = query.where(
        "createdAt",
        ">=",
        Timestamp.fromDate(new Date(startDate)),
      );
    if (endDate)
      query = query.where(
        "createdAt",
        "<=",
        Timestamp.fromDate(new Date(endDate)),
      );
    return (await query.count().get()).data().count;
  },

  async getMostViewed(limit = 5) {
    const snap = await col(COLLECTION)
      .orderBy("views", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) =>
      pick(mapDoc<BlogRaw>(d), ["title", "views", "coverImage", "slug"]),
    );
  },

  async getContentStatusCount(startDate?: string, endDate?: string) {
    let baseQuery: any = col(COLLECTION);
    if (startDate)
      baseQuery = baseQuery.where(
        "createdAt",
        ">=",
        Timestamp.fromDate(new Date(startDate)),
      );
    if (endDate)
      baseQuery = baseQuery.where(
        "createdAt",
        "<=",
        Timestamp.fromDate(new Date(endDate)),
      );

    // Execute 3 count queries concurrently to use only 3 reads instead of a full collection scan
    const [publishedSnap, draftSnap, hiddenSnap] = await Promise.all([
      baseQuery.where("status", "==", "published").count().get(),
      baseQuery.where("status", "==", "draft").count().get(),
      baseQuery.where("status", "==", "hidden").count().get(),
    ]);

    return [
      { name: "Published", value: publishedSnap.data().count },
      { name: "Draft", value: draftSnap.data().count },
      { name: "Hidden", value: hiddenSnap.data().count },
    ];
  },

  async getTopAuthors(limit = 5, startDate?: string, endDate?: string) {
    let query: any = col(COLLECTION);
    if (startDate)
      query = query.where(
        "createdAt",
        ">=",
        Timestamp.fromDate(new Date(startDate)),
      );
    if (endDate)
      query = query.where(
        "createdAt",
        "<=",
        Timestamp.fromDate(new Date(endDate)),
      );

    // Limit to latest 1000 posts to prevent full collection scan
    const snap = await query.orderBy("createdAt", "desc").limit(1000).get();

    const counts = new Map<string, number>();
    snap.docs.forEach((d: any) => {
      const rawAuthor = d.data()?.author;
      const author =
        typeof rawAuthor === "string"
          ? rawAuthor.trim()
          : rawAuthor && typeof rawAuthor === "object"
            ? String((rawAuthor as { name?: unknown; email?: unknown }).name ?? (rawAuthor as { email?: unknown }).email ?? "").trim()
            : "";
      if (!author || author.toLowerCase() === "unknown") return;
      counts.set(author, (counts.get(author) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
