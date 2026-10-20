"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/app/components/ui/kit";
import { userService } from "@/services/userService";
import { handleApiError } from "@/lib/axios";
import { toastUtils } from "@/lib/toast";

interface DeleteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userIdToDelete: string;
    userNameToDelete: string;
}

/** ลบบัญชี — ยืนยันด้วยรหัสผ่านของผู้ลบ (ตรวจฝั่ง server ไม่ต้องล็อกอินใหม่) */
export default function DeleteUserModal({ isOpen, onClose, onSuccess, userIdToDelete, userNameToDelete }: DeleteUserModalProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!password) return;
        setLoading(true);
        try {
            await userService.deleteUser(userIdToDelete, password);
            toastUtils.success("ลบบัญชีแล้ว", `${userNameToDelete} จะเข้าสู่ระบบไม่ได้อีก`);
            setPassword("");
            onSuccess();
            onClose();
        } catch (err) {
            toastUtils.error("ลบไม่สำเร็จ", handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={isOpen}
            onClose={() => !loading && onClose()}
            title={`ลบบัญชี “${userNameToDelete}”?`}
            description="ผู้ใช้จะถูกออกจากระบบทุกอุปกรณ์และเข้าสู่ระบบไม่ได้อีก — ยืนยันด้วยรหัสผ่านของคุณ"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>ยกเลิก</button>
                    <button type="button" className="btn bg-negative text-white hover:opacity-90" onClick={() => submit()} disabled={loading || !password}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} ลบบัญชี
                    </button>
                </>
            }
        >
            <form onSubmit={submit}>
                <label className="label" htmlFor="confirm-password">รหัสผ่านของคุณ</label>
                <input id="confirm-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
            </form>
        </Modal>
    );
}
