import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/PageHeader'

const AttendanceClient = dynamic(() => import('@/components/dashboard/AttendanceClient'), {
  loading: () => (
    <div className="flex items-center justify-center p-12 text-secondary">
      <div className="spinner" />
      <span className="ml-3 text-sm">Loading Live Attendance...</span>
    </div>
  ),
})

export const metadata = { title: 'Live Attendance & Timecards | Prominentz' }

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!['OWNER', 'MANAGER'].includes(session.user.role)) redirect('/dashboard')

  return (
    <>
      <PageHeader
        title="Live Floor Attendance"
        subtitle="Monitor clocked-in staff, GPS geofence anomalies, and reconcile time entries in real-time."
      />
      <div className="page-body">
        <AttendanceClient />
      </div>
    </>
  )
}
