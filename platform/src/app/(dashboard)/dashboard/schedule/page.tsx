import { Metadata } from 'next';
import { ScheduleClient } from '@/components/dashboard/ScheduleClient';

export const metadata: Metadata = {
    title: 'Schedule | Resto Manager',
    description: 'Deputy-style weekly staff schedule and shift assignment',
};

export default function SchedulePage() {
    return <ScheduleClient />;
}
