export default function SectionHeading({ children }) {
  // A heading cleared in the admin is not shown.
  if (!children) return null

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex-1 h-[1px] bg-gray-200" />
      <h2 className="text-[13px] font-extrabold text-gray-900 tracking-[0.2em] uppercase whitespace-nowrap">
        {children}
      </h2>
      <div className="flex-1 h-[1px] bg-gray-200" />
    </div>
  )
}
