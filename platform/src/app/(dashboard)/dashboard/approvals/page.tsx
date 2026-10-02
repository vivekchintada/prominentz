import { Metadata } from 'next';
import ApprovalsClient from '@/components/dashboard/ApprovalsClient';

export const metadata: Metadata = {
    title: 'Approvals | Resto Manager',
    description: 'Pending shift swaps, leave requests, and operational approvals',
};

export default function ApprovalsPage() {
    return <ApprovalsClient />;
}
