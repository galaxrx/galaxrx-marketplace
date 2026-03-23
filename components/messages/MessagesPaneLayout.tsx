"use client";

import { usePathname } from "next/navigation";

export default function MessagesPaneLayout({
  threadList,
  children,
}: {
  threadList: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const inThread = /^\/messages\/[^/]+/.test(pathname);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-8rem)] md:h-[calc(100dvh-6rem)] min-h-0 border border-[rgba(161,130,65,0.2)] rounded-xl overflow-hidden bg-[#0F2035]">
      <aside
        className={`${inThread ? "hidden md:flex" : "flex"} w-full md:w-80 border-b md:border-b-0 md:border-r border-[rgba(161,130,65,0.2)] flex-shrink-0 flex-col bg-[#0F2035]`}
      >
        <div className="p-4 border-b border-[rgba(161,130,65,0.2)] bg-[#0F2035]">
          <h1 className="text-lg font-heading font-bold text-gold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0F2035]">{threadList}</div>
      </aside>
      <main className={`${inThread ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 bg-[#0D1B2A]`}>
        {children}
      </main>
    </div>
  );
}
