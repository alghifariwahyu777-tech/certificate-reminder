/** Shown while a project page loads (data is computed on the server), so the screen never sits blank. */
export default function ProjectsLoading() {
  return (
    <div className="space-y-5 p-5 md:p-8" aria-busy="true" aria-label="Memuat data project">
      <div className="space-y-2">
        <div className="skeleton h-6 w-64" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton mt-3 h-6 w-32" />
            <div className="skeleton mt-2 h-3 w-40 max-w-full" />
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
            <div className="skeleton hidden h-2 w-32 sm:block" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
