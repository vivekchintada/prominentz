import { Metadata } from 'next';
import { KitchenOverviewClient } from '@/components/dashboard/KitchenOverviewClient';

export const metadata: Metadata = {
    title: 'Kitchen Overview | Resto Manager',
    description: 'Manager telemetry across Hot, Cold, Bar, and Expo kitchen lines',
};

export default function KitchenOverviewPage() {
    return <KitchenOverviewClient />;
}
