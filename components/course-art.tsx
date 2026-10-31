import { BarChart3, Blocks, Compass, Lightbulb, Sparkles } from "lucide-react";

export function CourseArt({ category, color, accent, compact = false }: { category: string; color: string; accent: string; compact?: boolean }) {
  const Icon = category === "Design" ? Blocks : category === "Development" ? Compass : category === "Data" ? BarChart3 : Lightbulb;
  return <div className={`relative overflow-hidden ${compact ? "h-16 w-16 rounded-2xl" : "aspect-[16/10] w-full rounded-[26px]"}`} style={{ background: color }}>
    <div className="absolute -right-[10%] -top-[18%] h-[65%] w-[65%] rounded-full opacity-25" style={{ background: accent }}/>
    <div className="absolute -bottom-[35%] -left-[8%] h-[70%] w-[70%] rounded-full border-[18px] opacity-20" style={{ borderColor: accent }}/>
    <div className={`absolute grid place-items-center rounded-[26%] text-white shadow-xl ${compact ? "inset-[22%]" : "left-[34%] top-[25%] h-[48%] w-[32%]"}`} style={{ background: accent }}><Icon className={compact ? "h-5 w-5" : "h-10 w-10"}/></div>
    {!compact && <><Sparkles className="absolute right-[14%] top-[16%] h-5 w-5 opacity-40" style={{ color: accent }}/><span className="absolute bottom-5 left-5 rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">{category}</span></>}
  </div>;
}

export function ProgressRing({ value, size = 52 }: { value: number; size?: number }) {
  const radius = 18; const circumference = 2 * Math.PI * radius; const offset = circumference - (Math.min(100, value) / 100) * circumference;
  return <div className="relative grid place-items-center" style={{ width: size, height: size }}><svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90"><circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-black/10"/><circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-[#735ff2] transition-all duration-500"/></svg><span className="text-[10px] font-black">{value}%</span></div>;
}
