import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { PageBody } from "@/components/layout/PageBody";
import { Notice } from "@/components/ui/Notice";
import { TaskList } from "@/components/tasks/TaskList";
import { getTasks, ownerOfRole } from "@/lib/tasks";

export default async function TasksPage() {
  const session = await getSession();
  const tasks = await getTasks();
  return (
    <>
      <Navbar title="Tugas Saya" subtitle="Hal yang perlu ditindaklanjuti setiap bagian" adminName={session?.name || "Admin"} role={session?.role || "ADMIN"} />
      <PageBody>
        <Notice tone="info">
          Tugas disusun otomatis dari data project, personil, alat, dan sertifikat. Setiap tugas ditujukan ke satu bagian dan terlihat oleh bagian lain, sehingga
          semua pihak tahu apa yang sedang ditunggu. Tugas hilang sendiri setelah datanya diperbarui.
        </Notice>
        <TaskList tasks={tasks} mine={ownerOfRole(session?.role)} />
      </PageBody>
    </>
  );
}
