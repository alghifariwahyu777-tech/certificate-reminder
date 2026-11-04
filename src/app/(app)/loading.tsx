/**
 * Shown the moment a menu item is clicked, while the server prepares the page,
 * so the screen responds at once instead of looking frozen.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman">
      <div className="flex h-[73px] items-center gap-3 border-b border-line bg-white/80 px-5 md:px-8 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-44" />
          <div className="skeleton h-3 w-64 max-w-[50vw]" />
        </div>
      </div>
      <div className="space-y-5 p-5 md:p-8">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="skeleton h-3.5 w-24" />
              <div className="skeleton mt-3 h-6 w-32" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line/70 py-3.5 last:border-0 dark:border-slate-800">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/3" />
              </div>
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
