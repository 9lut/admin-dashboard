import Image from "next/image";
import logo from "../../../../public/Image/LOGO-MSS.png";

/**
 * โลโก้ MSS จากไฟล์จริง (public/Image/LOGO-MSS.png)
 * tone="white" ใช้ filter เปลี่ยนเป็นสีขาวสำหรับวางบนพื้นน้ำเงิน
 */
export function Logo({ className = "size-10", tone = "brand", priority }: { className?: string; tone?: "brand" | "white"; priority?: boolean }) {
  return (
    <Image
      src={logo}
      alt="MSS"
      sizes="128px"
      priority={priority}
      className={`object-contain ${tone === "white" ? "brightness-0 invert" : ""} ${className}`}
    />
  );
}

/** โลโก้ในกรอบสี่เหลี่ยมมนสีขาว */
export function LogoBadge({ className = "size-10" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-white shadow-[0_6px_16px_rgba(2,153,209,0.22)] ring-1 ring-sky-100 ${className}`}>
      <Logo className="size-[68%]" />
    </span>
  );
}
