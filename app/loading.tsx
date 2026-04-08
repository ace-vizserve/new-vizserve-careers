export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>

        <p className="text-sm text-slate-500 tracking-wide">Preparing your application form...</p>

        <p className="text-xs text-slate-400 mt-1">This will only take a moment</p>
      </div>
    </div>
  );
}
