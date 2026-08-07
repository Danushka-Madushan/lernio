/**
 * Example Stat Card
 * 
 * DESIGN.md References:
 * - Layout: standard canvas layout on `#f8f9fa` backgrounds, 
 *   raising pristine `#ffffff` surface cards.
 * - Elevation & Depth: Employs the expansive Google-style shadow 
 *   `shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]`.
 * - Shapes: Major cards use `rounded-2xl` corners. Icons use `rounded-full`.
 * - Typography: Labels use standard secondary text (`text-[#5f6368]`) at `12px` (`text-xs`).
 */
export default function ExampleStatCard({ label = "Total Students", value = "1,234", icon }: {
  label?: string;
  value?: string | number;
  icon: React.ReactNode;
}) {
  return (
    // Surface Container with Elevation
    <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      
      {/* Icon Wrapper (Info tone) */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
        {icon}
      </div>

      {/* Text Container */}
      <div className="min-w-0">
        <p className="text-[20px] font-medium leading-tight text-[#202124]">{value}</p>
        <p className="truncate text-[12px] text-[#5f6368]">{label}</p>
      </div>
      
    </div>
  );
}
