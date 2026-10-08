'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface KdsItem {
    id: string;
    quantity: number;
    menuItem: { name: string };
    status: string;
    seatNumber?: number;
    specialNote?: string | null;
}

interface KdsTicket {
    id: string;
    station: 'HOT' | 'COLD' | 'BAR' | 'EXPO' | 'ALL';
    status: 'NEW' | 'IN_PROGRESS' | 'READY' | 'SERVED';
    createdAt: string;
    order: {
        id: string;
        createdAt: string;
        guestCount: number;
        notes?: string | null;
        table?: { name: string } | null;
        server?: { name: string | null } | null;
    };
    items: KdsItem[];
}

interface KpiData {
    ordersLastHour: number;
    avgTicketTimeMins: number;
    activeTickets: number;
    overdueTickets: number;
    activeKitchenStaff: number;
}

interface MenuItem86 {
    id: string;
    name: string;
    price: number;
    category?: { name: string };
    is86d?: boolean;
    isAvailable: boolean;
}

const STATION_CONFIG = {
    HOT: {
        name: 'Hot Line',
        icon: '🔥',
        color: '#f97316',
        bg: 'rgba(249, 115, 22, 0.1)',
        border: 'rgba(249, 115, 22, 0.3)',
    },
    COLD: {
        name: 'Cold & Salad',
        icon: '🥗',
        color: '#06b6d4',
        bg: 'rgba(6, 182, 212, 0.1)',
        border: 'rgba(6, 182, 212, 0.3)',
    },
    BAR: {
        name: 'Bar & Drinks',
        icon: '🍸',
        color: '#a855f7',
        bg: 'rgba(168, 85, 247, 0.1)',
        border: 'rgba(168, 85, 247, 0.3)',
    },
    EXPO: {
        name: 'Expo & Pass',
        icon: '🛎️',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.3)',
    },
};

export function KitchenOverviewClient() {
    const [tickets, setTickets] = useState<KdsTicket[]>([]);
    const [kpi, setKpi] = useState<KpiData>({
        ordersLastHour: 0,
        avgTicketTimeMins: 0,
        activeTickets: 0,
        overdueTickets: 0,
        activeKitchenStaff: 0,
    });
    const [items86, setItems86] = useState<MenuItem86[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [ticketsRes, kpiRes, menuRes] = await Promise.all([
                fetch('/api/kds/tickets'),
                fetch('/api/kds/kpi'),
                fetch('/api/menu/items?includeUnavailable=true'),
            ]);

            if (ticketsRes.ok) {
                const tData = await ticketsRes.json();
                setTickets(tData);
            }
            if (kpiRes.ok) {
                const kData = await kpiRes.json();
                setKpi(kData);
            }
            if (menuRes.ok) {
                const mData = await menuRes.json();
                const outOfStock = mData.filter((i: unknown) => i.is86d === true || i.isAvailable === false);
                setItems86(outOfStock);
            }
        } catch (err) {
            console.error('Failed to load kitchen overview:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const getElapsedTimeStr = (createdAt: string) => {
        const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
        const totalSec = Math.floor(diffMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    };

    const isOverdue = (createdAt: string) => {
        const diffMs = Date.now() - new Date(createdAt).getTime();
        return diffMs > 12 * 60 * 1000;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ── Header Bar ───────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                        Live Kitchen Telemetry
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => { setLoading(true); fetchData(); }}
                        style={{ padding: '8px 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                    >
                        🔄 {loading ? 'Syncing...' : 'Refresh'}
                    </button>

                    <Link
                        href="/kds"
                        target="_blank"
                        style={{
                            padding: '8px 16px',
                            background: '#ea580c',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '12px',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(234,88,12,0.35)',
                        }}
                    >
                        <span>🍳</span>
                        <span>Launch Fullscreen KDS ↗</span>
                    </Link>
                </div>
            </div>

            {/* ── KPI Metric Cards ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {[
                    { label: 'Active Tickets', value: `${kpi.activeTickets}`, icon: '🔥', color: '#f97316' },
                    { label: 'In Alert (>12m)', value: `${kpi.overdueTickets}`, icon: '⚠️', color: kpi.overdueTickets > 0 ? '#ef4444' : '#22c55e' },
                    { label: 'Avg Ticket Time', value: `${kpi.avgTicketTimeMins}m`, icon: '⏱️', color: 'var(--color-text-primary)' },
                    { label: 'Past Hour Volume', value: `${kpi.ordersLastHour ?? 0}`, icon: '📦', color: 'var(--brand)' },
                    { label: 'Clocked-In Cooks', value: `${kpi.activeKitchenStaff}`, icon: '👨‍🍳', color: '#10b981' },
                ].map((item) => (
                    <div
                        key={item.label}
                        style={{
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>{item.icon}</span>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: item.color, marginTop: '2px' }}>
                                {item.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Station Breakdown Grid ───────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {(['HOT', 'COLD', 'BAR', 'EXPO'] as const).map((stationKey) => {
                    const conf = STATION_CONFIG[stationKey];
                    const stationTickets = tickets.filter(t => t.station === stationKey || t.station === 'ALL');
                    const overdueCount = stationTickets.filter(t => isOverdue(t.createdAt)).length;

                    return (
                        <div
                            key={stationKey}
                            style={{
                                background: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-xl)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '320px',
                                boxShadow: 'var(--shadow-sm)',
                            }}
                        >
                            {/* Station Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>{conf.icon}</span>
                                    <div>
                                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{conf.name}</h3>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                                            {stationTickets.length} active ticket{stationTickets.length === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                </div>

                                {overdueCount > 0 ? (
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '10px', fontWeight: 800, border: '1px solid rgba(239,68,68,0.3)' }}>
                                        {overdueCount} ALERT
                                    </span>
                                ) : (
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg-input)', color: 'var(--color-text-tertiary)', fontSize: '10px', fontWeight: 700 }}>
                                        NORMAL
                                    </span>
                                )}
                            </div>

                            {/* Ticket Stack */}
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
                                {stationTickets.length === 0 ? (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', padding: '24px 0' }}>
                                        <span style={{ fontSize: '24px', opacity: 0.5, marginBottom: '6px' }}>✅</span>
                                        <div style={{ fontSize: '12px', fontWeight: 700 }}>Line is clear</div>
                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>No active tickets assigned</div>
                                    </div>
                                ) : (
                                    stationTickets.map((ticket) => {
                                        const agingAlert = isOverdue(ticket.createdAt);
                                        const elapsed = getElapsedTimeStr(ticket.createdAt);

                                        return (
                                            <div
                                                key={ticket.id}
                                                style={{
                                                    background: agingAlert ? 'rgba(239,68,68,0.08)' : 'var(--color-bg-input)',
                                                    border: `1px solid ${agingAlert ? 'rgba(239,68,68,0.4)' : 'var(--color-border)'}`,
                                                    borderRadius: 'var(--radius-lg)',
                                                    padding: '10px 12px',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                                        {ticket.order.table?.name || 'Table'}
                                                    </span>
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontFamily: 'monospace',
                                                        fontWeight: 800,
                                                        fontSize: '11px',
                                                        background: agingAlert ? '#ef4444' : 'var(--color-bg-card)',
                                                        color: agingAlert ? '#fff' : 'var(--color-text-secondary)',
                                                    }}>
                                                        ⏱ {elapsed}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                    {ticket.items.map((item, idx) => (
                                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                                                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                                                                {item.quantity}x {item.menuItem?.name}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '9px',
                                                                fontWeight: 800,
                                                                textTransform: 'uppercase',
                                                                padding: '1px 5px',
                                                                borderRadius: '3px',
                                                                color: item.status === 'READY' ? '#22c55e' : item.status === 'PREP' ? '#f59e0b' : 'var(--color-text-tertiary)',
                                                                background: item.status === 'READY' ? 'rgba(34,197,94,0.1)' : item.status === 'PREP' ? 'rgba(245,158,11,0.1)' : 'var(--color-bg-card)',
                                                            }}>
                                                                {item.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                                                    <span>Server: {ticket.order.server?.name || 'Floor'}</span>
                                                    <span>{ticket.order.guestCount} guests</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── 86'd Items Quick Reference ──────────────────────── */}
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🚫</span>
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                86&apos;d Out of Stock Quick-Reference
                            </h2>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                Menu items automatically locked on POS and customer QR menus
                            </p>
                        </div>
                    </div>

                    <span style={{ padding: '3px 10px', background: 'var(--color-bg-input)', borderRadius: '20px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                        {items86.length} Item{items86.length === 1 ? '' : 's'} 86&apos;d
                    </span>
                </div>

                {items86.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)' }}>
                        <div style={{ fontSize: '22px', marginBottom: '4px' }}>✨</div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)' }}>Full Menu In Stock</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>No items are currently 86&apos;d. All dishes can be rung up.</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                        {items86.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    background: 'var(--color-bg-input)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: '13px' }}>{item.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                        {item.category?.name || 'Menu'} • ${Number(item.price).toFixed(2)}
                                    </div>
                                </div>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 800, fontSize: '10px', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    86&apos;d
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
