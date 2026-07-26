import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小城应急局 · Pixel Multi-Agent Simulation",
  description: "观察 Supervisor、Group Chat、Event Bus 与 DAG 如何共同应对一座像素城市里的突发事件。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
