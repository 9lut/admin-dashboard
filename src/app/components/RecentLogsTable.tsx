"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Log {
    _id: string;
    action: string;
    resource: string;
    userId?: string;
    details: {
        email?: string;
        [key: string]: any;
    };
    ip: string;
    createdAt: string;
}

interface RecentLogsTableProps {
    logs: Log[];
}

const getActionColor = (action: string) => {
    switch (action) {
        case 'LOGIN': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20';
        case 'Error': return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20';
        default: return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20';
    }
};

export const RecentLogsTable = ({ logs }: RecentLogsTableProps) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left text-muted">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-800/50 dark:text-slate-400">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold rounded-l-xl">User</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Action</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Resource</th>
                            <th scope="col" className="px-6 py-4 font-semibold rounded-r-xl">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {paginatedLogs.map((log) => (
                            <tr key={log._id} className="bg-transparent hover:bg-surface-2 transition-colors">
                                <td className="px-6 py-4 font-medium text-fg whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span title={log.userId || 'System'}>{log.details?.email || (log.userId ? `User: ${log.userId.substring(0,8)}...` : 'Unknown')}</span>
                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">{log.ip}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-fg-2">
                                    {log.resource}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">
                                    {new Date(log.createdAt).toLocaleString('th-TH', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {paginatedLogs.map((log) => (
                    <div key={log._id} className="p-4 rounded-xl bg-surface-2 border border-line">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-semibold text-fg text-sm">{log.details.email || 'Unknown'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.ip}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>
                                {log.action}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                            <span>{log.resource}</span>
                            <span className="font-mono">
                                {new Date(log.createdAt).toLocaleString('th-TH', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {logs.length === 0 && (
                <div className="text-center text-slate-500 py-8 text-sm">No recent logs found.</div>
            )}

            {/* Pagination Controls */}
            {logs.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-line">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Rows:</span>
                        <select
                            className="bg-transparent text-xs font-medium outline-none text-fg-2 cursor-pointer py-1 pr-1 border rounded border-line"
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select>
                    </div>

                    <div className="flex gap-1">
                        <button
                            type="button"
                            aria-label="หน้าก่อนหน้า"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            aria-label="หน้าถัดไป"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
