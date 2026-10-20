"use client";

import { PageHeader } from "@/app/components/ui/PageHeader";
import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Filter } from "lucide-react";
import { activityService } from "@/services/activityService";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, parseISO, getYear, startOfYear, endOfYear } from "date-fns";
import { th } from "date-fns/locale";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function ActivityCalendarPage() {
    const { toast } = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const data = await activityService.getRoadmap();
            setActivities(data || []);
        } catch (error) {
            console.error("Failed to fetch activities", error);
            toast({ title: "ผิดพลาด", description: "ไม่สามารถโหลดกิจกรรมได้", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Calendar calculations
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get activities for a specific date
    const getActivitiesForDate = (date: Date) => {
        if (!Array.isArray(activities)) return [];
        return activities.filter(activity => {
            const activityDate = parseISO(activity.start_date);
            return isSameDay(activityDate, date);
        });
    };

    // Get activities for selected date
    const selectedDateActivities = useMemo(() => {
        return getActivitiesForDate(selectedDate);
    }, [selectedDate, activities]);

    // Get activities for selected year
    const yearActivities = useMemo(() => {
        if (!Array.isArray(activities)) return [];
        return activities
            .filter(activity => {
                const activityDate = parseISO(activity.start_date);
                return getYear(activityDate) === selectedYear;
            })
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [activities, selectedYear]);

    // Get available years from activities
    const availableYears = useMemo(() => {
        if (!Array.isArray(activities)) return [getYear(new Date())];
        const years = activities.map(activity => getYear(parseISO(activity.start_date)));
        return [...new Set(years)].sort((a, b) => b - a);
    }, [activities]);

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const handleToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const weekDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

    // Pad calendar to start on Sunday
    const firstDayOfMonth = monthStart.getDay();
    const paddingDays = Array(firstDayOfMonth).fill(null);

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <PageHeader title="ปฏิทินกิจกรรม" description="แสดงกิจกรรมทั้งหมดในแต่ละเดือน" art="calendar">

                {/* Month/Year Controls */}
                <div className="flex items-center gap-2 bg-surface p-2 rounded-xl border border-line shadow-sm">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="px-2 sm:px-4 min-w-[140px] sm:min-w-[180px] text-center">
                        <p className="font-bold text-sm sm:text-base text-fg">
                            {format(currentDate, "MMMM", { locale: th })} {currentDate.getFullYear() + 543}
                        </p>
                    </div>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <button
                        onClick={handleToday}
                        className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                    >
                        วันนี้
                    </button>
                </div>
            </PageHeader>

            {/* Calendar Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
                {/* Calendar - Full width on mobile, 75% on desktop */}
                <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 bg-surface-2 border-b border-line">
                        {weekDays.map((day, idx) => (
                            <div
                                key={idx}
                                className="p-2 sm:p-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days Grid */}
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-7">
                            {/* Padding days */}
                            {paddingDays.map((_, idx) => (
                                <div key={`pad-${idx}`} className="aspect-square border-b border-r border-line bg-slate-50/30 dark:bg-slate-900/30" />
                            ))}

                            {/* Calendar days */}
                            {calendarDays.map((day) => {
                                const dayActivities = getActivitiesForDate(day);
                                const isSelected = isSameDay(day, selectedDate);
                                const isTodayDate = isToday(day);

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`aspect-square border-b border-r border-line p-1 sm:p-2 cursor-pointer transition-all hover:bg-sky-50 dark:hover:bg-sky-950/30 ${isSelected ? "bg-sky-50 dark:bg-sky-950/50 ring-2 ring-sky-500" : ""
                                            }`}
                                    >
                                        <div className="h-full flex flex-col">
                                            <div className="flex items-center justify-between mb-1">
                                                <span
                                                    className={`text-xs sm:text-sm font-bold ${isTodayDate
                                                        ? "w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-sky-500 text-white"
                                                        : isSelected
                                                            ? "text-sky-600 dark:text-sky-400"
                                                            : "text-fg-2"
                                                        }`}
                                                >
                                                    {format(day, "d")}
                                                </span>
                                            </div>

                                            {/* Activity dots - Only show on larger screens */}
                                            <div className="flex-1 overflow-hidden space-y-0.5 hidden sm:block">
                                                {dayActivities.slice(0, 2).map((activity, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-[9px] px-1 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded truncate"
                                                    >
                                                        {activity.name_th}
                                                    </div>
                                                ))}
                                                {dayActivities.length > 2 && (
                                                    <div className="text-[8px] text-slate-400 pl-1">
                                                        +{dayActivities.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Show dot indicator on mobile */}
                                            {dayActivities.length > 0 && (
                                                <div className="flex sm:hidden justify-center mt-1">
                                                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Selected Date Details Sidebar - 25% on desktop, full on mobile */}
                <div className="bg-surface rounded-2xl border border-line shadow-sm p-4 lg:sticky lg:top-4 h-fit max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
                    <div className="mb-4 pb-3 border-b border-line">
                        <h3 className="font-bold text-sm text-fg mb-1">
                            {format(selectedDate, "d MMMM", { locale: th })} {selectedDate.getFullYear() + 543}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : selectedDateActivities.length > 0 ? (
                        <div className="space-y-3">
                            {selectedDateActivities.map((activity) => (
                                <div
                                    key={activity._id}
                                    className="p-3 bg-surface-2 rounded-xl border border-line hover:shadow-md transition-shadow"
                                >
                                    <h4 className="font-bold text-xs text-fg mb-1 line-clamp-2">
                                        {activity.name_th}
                                    </h4>
                                    {activity.name_eng && (
                                        <p className="text-[10px] text-muted mb-2 italic line-clamp-1">
                                            {activity.name_eng}
                                        </p>
                                    )}

                                    <div className="space-y-1.5">
                                        {activity.start_date && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                <Clock size={10} className="flex-shrink-0" />
                                                <span className="line-clamp-1">
                                                    {format(parseISO(activity.start_date), "HH:mm", { locale: th })}
                                                    {activity.end_date && ` - ${format(parseISO(activity.end_date), "HH:mm น.", { locale: th })}`}
                                                </span>
                                            </div>
                                        )}

                                        {activity.location && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                <MapPin size={10} className="flex-shrink-0" />
                                                <span className="line-clamp-1">{activity.location}</span>
                                            </div>
                                        )}
                                        {activity.description && (
                                            <p className="mt-2 pt-2 border-t border-line text-xs text-muted line-clamp-7">
                                                {activity.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CalendarIcon size={20} className="text-slate-400" />
                            </div>
                            <p className="text-xs text-slate-500">ไม่มีกิจกรรมในวันนี้</p>
                        </div>
                    )}
                </div>
            </div>

            {/* All Activities Section */}
            <div className="bg-surface rounded-2xl border border-line shadow-sm p-5">
                {/* Year Filter Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-line">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-sky-500" />
                        <h3 className="font-bold text-fg">
                            กิจกรรมทั้งหมด
                        </h3>
                        <span className="text-xs text-slate-500">({yearActivities.length} กิจกรรม)</span>
                    </div>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-1.5 bg-surface-2 border border-line rounded-lg text-sm font-medium text-fg-2 outline-none focus:ring-2 focus:ring-sky-500"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>ปี {year + 543}</option>
                        ))}
                    </select>
                </div>

                {/* Activities List */}
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                ) : yearActivities.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {yearActivities.map((activity) => (
                            <div
                                key={activity._id}
                                className="p-4 bg-surface-2 rounded-xl border border-line hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="font-bold text-sm text-fg line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                        {activity.name_th}
                                    </h4>
                                    <div className="flex-shrink-0 px-2 py-0.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded text-[10px] font-bold">
                                        {format(parseISO(activity.start_date), "MMM", { locale: th })}
                                    </div>
                                </div>

                                {activity.name_eng && (
                                    <p className="text-[10px] text-muted mb-2 italic line-clamp-1">
                                        {activity.name_eng}
                                    </p>
                                )}

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Clock size={12} className="flex-shrink-0 text-sky-500" />
                                        <span className="line-clamp-1">
                                            {format(parseISO(activity.start_date), "d MMM", { locale: th })} {parseISO(activity.start_date).getFullYear() + 543}, {format(parseISO(activity.start_date), "HH:mm", { locale: th })}
                                            {activity.end_date && ` - ${format(parseISO(activity.end_date), "HH:mm น.", { locale: th })}`}
                                        </span>
                                    </div>

                                    {activity.location && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <MapPin size={12} className="flex-shrink-0 text-sky-500" />
                                            <span className="line-clamp-1">{activity.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon size={28} className="text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500">ไม่มีกิจกรรมในปี {selectedYear + 543}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
