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
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-8rem)] md:h-[calc(100dvh-6rem)] min-h-0 border border-[rgba(161,130,65,0.2)] rounded-xl overflow-visible md:overflow-hidden bg-[#0F2035]">
      <aside
        className={`${inThread ? "hidden md:flex" : "flex"} w-full md:w-80 max-h-[calc(100dvh-8rem)] md:max-h-none border-b md:border-b-0 md:border-r border-[rgba(161,130,65,0.2)] flex-shrink-0 flex-col bg-[#0F2035]`}
      >
        <div className="p-4 border-b border-[rgba(161,130,65,0.2)] bg-[#0F2035]">
          <h1 className="text-lg font-heading font-bold text-gold">Messages</h1>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-20 md:pb-0 bg-[#0F2035]">
          {threadList}
        </div>
      </aside>
      <main className={`${inThread ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 max-h-[calc(100dvh-8rem)] md:max-h-none overflow-y-auto md:overflow-hidden bg-[#0D1B2A]`}>
        {children}
      </main>
    </div>
  );
}
