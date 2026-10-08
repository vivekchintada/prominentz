'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast, ToastContainer } from '../ui/Toast';
import { ShiftSwapDrawer } from './ShiftSwapDrawer';

interface ShiftNote {
    id: string;
    note: string;
    createdBy: string;
    createdAt: string;
}

interface Employee {
    id: string;
    jobTitle?: string | null;
    hourlyRate?: number | string | null;
    user: {
        id: string;
        name: string | null;
        email: string;
        role: string;
    };
}

interface Shift {
    id: string;
    employeeId: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    role: 'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER';
    isOpen?: boolean;
    notes?: ShiftNote[];
    employee?: Employee;
}

interface ShiftTemplateData {
    id: string;
    name: string;
    role: 'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER';
    station?: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

interface CoverageEvaluation {
    ruleId: string;
    dayOfWeek: number;
    role: string;
    station?: string | null;
    minStaff: number;
    targetStaff: number;
    scheduledCount: number;
    deficit: number;
    status: 'UNDERSTAFFED' | 'OPTIMAL' | 'OVERSTAFFED';
}

interface DayForecast {
    dayOfWeek: number;
    dayName: string;
    projectedOrders: number;
    projectedGuests: number;
    recommendedStaff: {
        SERVER: number;
        KITCHEN: number;
        MANAGER: number;
        TOTAL: number;
    };
}

const ROLE_COLORS: Record<string, { bg: string; border: string; text: string; badgeBg: string }> = {
    SERVER: {
        bg: 'rgba(255, 255, 255, 0.08)',
        border: 'var(--color-text-primary)',
        text: '#60a5fa',
        badgeBg: 'rgba(255, 255, 255, 0.08)',
    },
    KITCHEN: {
        bg: 'rgba(249, 115, 22, 0.12)',
        border: '#f97316',
        text: '#fb923c',
        badgeBg: 'rgba(249, 115, 22, 0.2)',
    },
    MANAGER: {
        bg: 'rgba(168, 85, 247, 0.12)',
        border: '#a855f7',
        text: '#c084fc',
        badgeBg: 'rgba(168, 85, 247, 0.2)',
    },
    OWNER: {
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'var(--color-text-primary)',
        text: '#818cf8',
        badgeBg: 'rgba(99, 102, 241, 0.2)',
    },
};

const DEFAULT_TEMPLATES = [
    { name: 'Dinner Server (5p – 11p)', role: 'SERVER', start: '17:00', end: '23:00' },
    { name: 'Lunch Cook (10a – 4p)', role: 'KITCHEN', start: '10:00', end: '16:00' },
    { name: 'Dinner Line Cook (4p – 11p)', role: 'KITCHEN', start: '16:00', end: '23:00' },
    { name: 'Bar Close (4p – 12a)', role: 'SERVER', start: '16:00', end: '00:00' },
    { name: 'Floor Manager (8a – 5p)', role: 'MANAGER', start: '08:00', end: '17:00' },
];

export function ScheduleClient() {
    const [weekOffset, setWeekOffset] = useState(0);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const { toasts, showToast, dismissToast } = useToast();

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editShift, setEditShift] = useState<Shift | null>(null);
    const [selectedEmpId, setSelectedEmpId] = useState('');
    const [selectedRole, setSelectedRole] = useState<'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER'>('SERVER');
    const [shiftDate, setShiftDate] = useState('');
    const [startTime, setStartTime] = useState('17:00');
    const [endTime, setEndTime] = useState('23:00');
    const [isOpenShift, setIsOpenShift] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Drag-and-drop state
    const [draggedShiftId, setDraggedShiftId] = useState<string | null>(null);
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);

    // Copy Week modal state
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [sourceWeekOffset, setSourceWeekOffset] = useState(-1);
    const [copyingWeek, setCopyingWeek] = useState(false);

    // Shift Templates modal state
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templates, setTemplates] = useState<ShiftTemplateData[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [applyingTemplates, setApplyingTemplates] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        role: 'SERVER' as 'SERVER' | 'KITCHEN' | 'MANAGER' | 'OWNER',
        dayOfWeek: 1,
        startTime: '17:00',
        endTime: '23:00',
        station: '',
    });

    // Forecast and Coverage rules
    const [forecasts, setForecasts] = useState<Record<number, DayForecast>>({});
    const [coverageEvaluations, setCoverageEvaluations] = useState<Record<number, CoverageEvaluation[]>>({});
    const [claimingShiftId, setClaimingShiftId] = useState<string | null>(null);
    const [isSwapDrawerOpen, setIsSwapDrawerOpen] = useState(false);
    const [pendingSwapsCount, setPendingSwapsCount] = useState(0);

    // Calculate current Monday-Sunday window based on weekOffset
    const { weekDays, startDateStr, endDateStr, weekLabel } = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
        const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;

        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon + weekOffset * 7);
        monday.setHours(0, 0, 0, 0);

        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });

        const sunday = days[6];
        sunday.setHours(23, 59, 59, 999);

        const label = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        return {
            weekDays: days,
            startDateStr: monday.toISOString(),
            endDateStr: sunday.toISOString(),
            weekLabel: label,
        };
    }, [weekOffset]);

    const fetchScheduleData = useCallback(async () => {
        try {
            setLoading(true);
            const [empRes, shiftRes, forecastRes, coverageRes] = await Promise.all([
                fetch('/api/employees'),
                fetch(`/api/shifts?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`),
                fetch(`/api/labor/forecast?date=${encodeURIComponent(startDateStr)}`),
                fetch(`/api/labor/coverage?startDate=${encodeURIComponent(startDateStr)}`),
            ]);

            if (empRes.ok) {
                const emps = await empRes.json();
                setEmployees(emps);
                if (emps.length > 0 && !selectedEmpId) {
                    setSelectedEmpId(emps[0].id);
                }
            }
            if (shiftRes.ok) {
                const shiftData = await shiftRes.json();
                setShifts(shiftData);
            }
            if (forecastRes.ok) {
                const fcData = await forecastRes.json();
                if (fcData.forecast) {
                    const fMap: Record<number, DayForecast> = {};
                    fcData.forecast.forEach((f: DayForecast) => {
                        fMap[f.dayOfWeek] = f;
                    });
                    setForecasts(fMap);
                }
            }
            if (coverageRes.ok) {
                const covData = await coverageRes.json();
                if (covData.compliance?.evaluations) {
                    const cMap: Record<number, CoverageEvaluation[]> = {};
                    covData.compliance.evaluations.forEach((ev: CoverageEvaluation) => {
                        if (!cMap[ev.dayOfWeek]) cMap[ev.dayOfWeek] = [];
                        cMap[ev.dayOfWeek].push(ev);
                    });
                    setCoverageEvaluations(cMap);
                }
            }
            try {
                const swapRes = await fetch('/api/shifts/swap');
                if (swapRes.ok) {
                    const swapData = await swapRes.json();
                    if (Array.isArray(swapData)) {
                        setPendingSwapsCount(swapData.filter((t: unknown) => t.status?.includes('PENDING')).length);
                    }
                }
            } catch {}
        } catch (err) {
            console.error('Failed to load schedule:', err);
            showToast('Failed to load weekly schedule', 'error');
        } finally {
            setLoading(false);
        }
    }, [startDateStr, endDateStr, selectedEmpId, showToast]);

    useEffect(() => {
        fetchScheduleData();
    }, [fetchScheduleData]);

    const fetchTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const res = await fetch('/api/shifts/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch {
            showToast('Failed to load shift templates', 'error');
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplate.name.trim()) return;
        try {
            const res = await fetch('/api/shifts/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTemplate),
            });
            if (res.ok) {
                showToast('Template created successfully', 'success');
                setNewTemplate({
                    name: '',
                    role: 'SERVER',
                    dayOfWeek: 1,
                    startTime: '17:00',
                    endTime: '23:00',
                    station: '',
                });
                fetchTemplates();
            } else {
                const err = await res.json();
                showToast(err.error || 'Failed to create template', 'error');
            }
        } catch {
            showToast('Error creating template', 'error');
        }
    };

    const handleApplyTemplates = async () => {
        try {
            setApplyingTemplates(true);
            const res = await fetch('/api/shifts/templates/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStartDate: startDateStr }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Templates applied as draft shifts!', 'success');
                setIsTemplateModalOpen(false);
                fetchScheduleData();
            } else {
                showToast(data.error || 'Failed to apply templates', 'error');
            }
        } catch {
            showToast('Network error while applying templates', 'error');
        } finally {
            setApplyingTemplates(false);
        }
    };

    const handleCopyWeek = async () => {
        try {
            setCopyingWeek(true);
            const now = new Date();
            const currentDay = now.getDay();
            const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;

            const sourceMon = new Date(now);
            sourceMon.setDate(now.getDate() + diffToMon + sourceWeekOffset * 7);
            sourceMon.setHours(0, 0, 0, 0);

            const res = await fetch('/api/shifts/copy-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceStartDate: sourceMon.toISOString(),
                    targetStartDate: startDateStr,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Week copied successfully as draft shifts!', 'success');
                setIsCopyModalOpen(false);
                fetchScheduleData();
            } else {
                showToast(data.error || 'Failed to copy week', 'error');
            }
        } catch {
            showToast('Network error copying week', 'error');
        } finally {
            setCopyingWeek(false);
        }
    };

    const handleClaimShift = async (shiftId: string) => {
        try {
            setClaimingShiftId(shiftId);
            const res = await fetch('/api/shifts/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shiftId }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Shift claimed successfully!', 'success');
                fetchScheduleData();
            } else {
                showToast(data.error || 'Could not claim shift', 'error');
            }
        } catch {
            showToast('Network error while claiming shift', 'error');
        } finally {
            setClaimingShiftId(null);
        }
    };

    const handlePublishSchedule = async () => {
        try {
            setPublishing(true);
            const res = await fetch('/api/shifts/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startDateStr,
                    endDate: endDateStr,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message || 'Schedule published & staff notified!', 'success');
                fetchScheduleData();
            } else {
                showToast(data.error || 'Failed to publish schedule', 'error');
            }
        } catch {
            showToast('Network error while publishing', 'error');
        } finally {
            setPublishing(false);
        }
    };

    const handleExportPayroll = () => {
        window.open(`/api/labor/payroll/export?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`, '_blank');
        showToast('Payroll CSV export started', 'success');
    };

    // Drag-and-drop shift reassignment
    const handleDragStart = (e: React.DragEvent, shiftId: string) => {
        e.dataTransfer.setData('text/plain', shiftId);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedShiftId(shiftId);
    };

    const handleDropShift = async (targetEmpId: string, targetDateStr: string, makeOpen = false) => {
        if (!draggedShiftId) return;
        const targetShift = shifts.find(s => s.id === draggedShiftId);
        if (!targetShift) return;

        // Keep shift duration and start hour:minute, shift date
        const origStart = new Date(targetShift.scheduledStart);
        const origEnd = new Date(targetShift.scheduledEnd);
        const durationMs = origEnd.getTime() - origStart.getTime();

        const newStart = new Date(`${targetDateStr}T${origStart.toTimeString().slice(0, 5)}:00`);
        const newEnd = new Date(newStart.getTime() + durationMs);

        // Optimistic UI update
        const previousShifts = [...shifts];
        setShifts(prev => prev.map(s => {
            if (s.id === draggedShiftId) {
                return {
                    ...s,
                    employeeId: targetEmpId,
                    scheduledStart: newStart.toISOString(),
                    scheduledEnd: newEnd.toISOString(),
                    isOpen: makeOpen,
                };
            }
            return s;
        }));

        try {
            const res = await fetch(`/api/shifts/${draggedShiftId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: targetEmpId,
                    scheduledStart: newStart.toISOString(),
                    scheduledEnd: newEnd.toISOString(),
                    isOpen: makeOpen,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to reassign shift');
            }
            showToast('Shift reassigned successfully', 'success');
        } catch (err: unknown) {
            setShifts(previousShifts);
            showToast(err.message || 'Error moving shift', 'error');
        } finally {
            setDraggedShiftId(null);
            setDragOverCell(null);
        }
    };

    const openAddModal = (empId?: string, dateStr?: string, isOpenDefault = false) => {
        setEditShift(null);
        setModalError(null);
        setSelectedEmpId(empId || (employees[0]?.id ?? ''));
        const defaultRole = employees.find(e => e.id === empId)?.user.role as any || 'SERVER';
        setSelectedRole(['SERVER', 'KITCHEN', 'MANAGER', 'OWNER'].includes(defaultRole) ? defaultRole : 'SERVER');
        setShiftDate(dateStr || new Date().toISOString().substring(0, 10));
        setStartTime('17:00');
        setEndTime('23:00');
        setIsOpenShift(isOpenDefault);
        setIsModalOpen(true);
    };

    const openEditModal = (shift: Shift) => {
        setEditShift(shift);
        setModalError(null);
        setSelectedEmpId(shift.employeeId);
        setSelectedRole(shift.role);
        setIsOpenShift(!!shift.isOpen);
        const startObj = new Date(shift.scheduledStart);
        const endObj = new Date(shift.scheduledEnd);
        setShiftDate(startObj.toISOString().substring(0, 10));
        setStartTime(startObj.toTimeString().substring(0, 5));
        setEndTime(endObj.toTimeString().substring(0, 5));
        setIsModalOpen(true);
    };

    const applyDefaultTemplate = (tpl: typeof DEFAULT_TEMPLATES[0]) => {
        setSelectedRole(tpl.role as any);
        setStartTime(tpl.start);
        setEndTime(tpl.end);
    };

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);

        if (!selectedEmpId || !shiftDate || !startTime || !endTime) {
            setModalError('Please fill in all required shift fields.');
            return;
        }

        const scheduledStart = new Date(`${shiftDate}T${startTime}:00`).toISOString();
        let scheduledEnd: string;
        if (endTime === '00:00' || endTime < startTime) {
            const nextDay = new Date(`${shiftDate}T${endTime}:00`);
            nextDay.setDate(nextDay.getDate() + 1);
            scheduledEnd = nextDay.toISOString();
        } else {
            scheduledEnd = new Date(`${shiftDate}T${endTime}:00`).toISOString();
        }

        try {
            setSaving(true);
            if (editShift) {
                const res = await fetch(`/api/shifts/${editShift.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: selectedEmpId,
                        role: selectedRole,
                        scheduledStart,
                        scheduledEnd,
                        isOpen: isOpenShift,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to update shift');
                }
                showToast('Shift updated successfully', 'success');
            } else {
                const res = await fetch('/api/shifts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: selectedEmpId,
                        role: selectedRole,
                        scheduledStart,
                        scheduledEnd,
                        isOpen: isOpenShift,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to schedule shift');
                }
                showToast('New shift scheduled', 'success');
            }

            setIsModalOpen(false);
            fetchScheduleData();
        } catch (err: unknown) {
            setModalError(err.message || 'Error saving shift');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteShift = async () => {
        if (!editShift) return;
        if (!confirm('Are you sure you want to delete this shift?')) return;
        try {
            setSaving(true);
            const res = await fetch(`/api/shifts/${editShift.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete shift');
            showToast('Shift deleted', 'success');
            setIsModalOpen(false);
            fetchScheduleData();
        } catch (err: unknown) {
            setModalError(err.message || 'Error deleting shift');
        } finally {
            setSaving(false);
        }
    };

    // Calculate Weekly KPI Stats
    const totalWeeklyHours = useMemo(() => {
        return shifts.reduce((acc, s) => {
            const start = new Date(s.scheduledStart).getTime();
            const end = new Date(s.scheduledEnd).getTime();
            const diffHours = Math.max(0, (end - start) / (1000 * 60 * 60));
            return acc + diffHours;
        }, 0);
    }, [shifts]);

    const estLaborCost = useMemo(() => {
        return shifts.reduce((acc, s) => {
            const emp = employees.find(e => e.id === s.employeeId);
            const rate = Number(emp?.hourlyRate || 16.5);
            const start = new Date(s.scheduledStart).getTime();
            const end = new Date(s.scheduledEnd).getTime();
            const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
            return acc + (hours * rate);
        }, 0);
    }, [shifts, employees]);

    const openShifts = useMemo(() => {
        return shifts.filter(s => s.isOpen);
    }, [shifts]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* ── KPI Metric Cards ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {[
                    { label: 'Total Scheduled Hours', value: `${totalWeeklyHours.toFixed(1)} hrs`, icon: '⏱️', color: 'var(--color-text-primary)' },
                    { label: 'Active Roster', value: `${employees.length} Staff`, icon: '👥', color: '#16a34a' },
                    { label: 'Open Shifts', value: `${openShifts.length} Claimable`, icon: '🔓', color: openShifts.length > 0 ? '#f59e0b' : '#10b981' },
                    { label: 'Est. Labor Cost', value: `$${estLaborCost.toFixed(0)}`, icon: '💰', color: '#a855f7' },
                ].map((kpi) => (
                    <div
                        key={kpi.label}
                        style={{
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>{kpi.icon}</span>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {kpi.label}
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: kpi.color, marginTop: '2px' }}>
                                {kpi.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Labor vs Sales Cost % Live Summary Bar ────────── */}
            {(() => {
                const projectedSales = 18500;
                const laborPct = (estLaborCost / projectedSales) * 100;
                const isOptimal = laborPct >= 24 && laborPct <= 30;
                const isHigh = laborPct > 30;

                return (
                    <div
                        style={{
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-xl)',
                            padding: '14px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '15px' }}>📊</span>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                    Labor-to-Sales Efficiency Bar
                                </span>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        background: isOptimal ? 'rgba(5, 150, 105, 0.15)' : isHigh ? 'rgba(239, 68, 68, 0.15)' : 'rgba(217, 119, 6, 0.15)',
                                        color: isOptimal ? 'var(--brand-emerald, #059669)' : isHigh ? '#ef4444' : 'var(--brand-amber, #d97706)',
                                    }}
                                >
                                    {laborPct.toFixed(1)}% of Sales ({isOptimal ? 'Optimal Range 25-30%' : isHigh ? 'Over Target >30%' : 'Under Benchmark'})
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                Projected Sales: ${projectedSales.toLocaleString()} · Scheduled Labor: ${estLaborCost.toFixed(0)}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                            <div
                                style={{
                                    width: `${Math.min(100, (laborPct / 40) * 100)}%`,
                                    height: '100%',
                                    borderRadius: '4px',
                                    background: isOptimal ? 'var(--brand-emerald, #059669)' : isHigh ? '#ef4444' : 'var(--brand-amber, #d97706)',
                                    transition: 'width 0.3s ease',
                                }}
                            />
                        </div>
                    </div>
                );
            })()}

            {/* ── Navigation & Actions Toolbar ─────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <button
                            onClick={() => setWeekOffset(w => w - 1)}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700 }}
                        >
                            ◀ Prev
                        </button>
                        <button
                            onClick={() => setWeekOffset(0)}
                            style={{ padding: '8px 14px', background: 'var(--color-bg-input)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setWeekOffset(w => w + 1)}
                            style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700 }}
                        >
                            Next ▶
                        </button>
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginLeft: '6px' }}>
                        📅 {weekLabel}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setIsSwapDrawerOpen(true)}
                        style={{
                            padding: '8px 14px',
                            background: 'var(--color-bg-card)',
                            border: pendingSwapsCount > 0 ? '1px solid var(--brand-amber, #d97706)' : '1px solid var(--color-border)',
                            color: pendingSwapsCount > 0 ? 'var(--brand-amber, #d97706)' : 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>🔄</span>
                        <span>Shift Swaps ({pendingSwapsCount})</span>
                    </button>

                    <button
                        onClick={handleExportPayroll}
                        style={{
                            padding: '8px 14px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>📥</span>
                        <span>Export Payroll</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsTemplateModalOpen(true);
                            fetchTemplates();
                        }}
                        style={{
                            padding: '8px 14px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>⚡</span>
                        <span>Templates</span>
                    </button>

                    <button
                        onClick={() => setIsCopyModalOpen(true)}
                        style={{
                            padding: '8px 14px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <span>📋</span>
                        <span>Copy Week</span>
                    </button>

                    <button
                        onClick={() => openAddModal(undefined, undefined, false)}
                        style={{
                            padding: '8px 16px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                        }}
                    >
                        + Add Shift
                    </button>

                    <button
                        onClick={handlePublishSchedule}
                        disabled={publishing}
                        style={{
                            padding: '8px 16px',
                            background: '#4f46e5',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 'var(--radius-lg)',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                        }}
                    >
                        <span>🚀</span>
                        <span>{publishing ? 'Publishing...' : 'Publish'}</span>
                    </button>
                </div>
            </div>

            {/* ── Role Badges & DnD Helper ─────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-tertiary)' }}>ROLES:</span>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-text-primary)', display: 'inline-block' }}></span> Server
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb923c', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f97316', display: 'inline-block' }}></span> Kitchen
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#a855f7', display: 'inline-block' }}></span> Manager
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', fontWeight: 700 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-text-primary)', display: 'inline-block' }}></span> Owner
                        </span>
                    </div>
                </div>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✋ Drag cards to reassign staff or reschedule days
                </span>
            </div>

            {/* ── Weekly Grid Table ────────────────────────────────── */}
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '850px' }}>
                        <thead>
                            <tr style={{ background: 'var(--color-bg-input)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', minWidth: '160px', borderRight: '1px solid var(--color-border)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                    Staff & Station
                                </th>
                                {weekDays.map((d, i) => {
                                    const isToday = new Date().toDateString() === d.toDateString();
                                    const dow = d.getDay();
                                    const dayFc = forecasts[dow];
                                    const understaffedRules = (coverageEvaluations[dow] || []).filter(e => e.status === 'UNDERSTAFFED');

                                    return (
                                        <th
                                            key={i}
                                            style={{
                                                padding: '10px 8px',
                                                textAlign: 'center',
                                                borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
                                                background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                width: '12%',
                                            }}
                                        >
                                            <div style={{ fontWeight: 800, color: isToday ? 'var(--color-text-primary)' : 'var(--color-text-primary)' }}>
                                                {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div style={{ fontSize: '11px', color: isToday ? '#818cf8' : 'var(--color-text-secondary)', marginTop: '2px' }}>
                                                {d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                            </div>

                                            {/* Demand Forecast Badge */}
                                            {dayFc && (dayFc.projectedGuests > 0 || dayFc.projectedOrders > 0) && (
                                                <div
                                                    title={`Forecast: ~${dayFc.projectedGuests} covers, ~${dayFc.projectedOrders} orders. Rec. Staff: ${dayFc.recommendedStaff.SERVER} Server, ${dayFc.recommendedStaff.KITCHEN} Kitchen`}
                                                    style={{
                                                        marginTop: '4px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(99,102,241,0.12)',
                                                        color: '#818cf8',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    ⚡ {dayFc.projectedGuests} covers
                                                </div>
                                            )}

                                            {/* Understaffing Warnings Badge */}
                                            {understaffedRules.length > 0 && (
                                                <div
                                                    title={understaffedRules.map(r => `Deficit: ${r.role} need ${r.minStaff} (have ${r.scheduledCount})`).join('\n')}
                                                    style={{
                                                        marginTop: '3px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(239,68,68,0.15)',
                                                        color: '#ef4444',
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    ⚠️ Understaffed
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {/* ── Open / Unassigned Shifts Row ──────────────── */}
                            <tr style={{ background: 'rgba(245,158,11,0.04)', borderBottom: '2px solid rgba(245,158,11,0.2)' }}>
                                <td style={{ padding: '10px 14px', borderRight: '1px solid var(--color-border)', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '14px' }}>🔓</span>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '12px', color: '#f59e0b' }}>
                                                Open Shifts
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                                                Claimable by staff
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => openAddModal(undefined, undefined, true)}
                                        style={{
                                            marginTop: '6px',
                                            padding: '3px 8px',
                                            background: 'rgba(245,158,11,0.1)',
                                            border: '1px solid rgba(245,158,11,0.3)',
                                            borderRadius: '4px',
                                            color: '#f59e0b',
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        + Open Shift
                                    </button>
                                </td>

                                {weekDays.map((d, dIdx) => {
                                    const dateStr = d.toISOString().substring(0, 10);
                                    const dayOpenShifts = openShifts.filter(s => {
                                        const sDate = new Date(s.scheduledStart).toISOString().substring(0, 10);
                                        return sDate === dateStr;
                                    });

                                    const cellKey = `open_${dateStr}`;
                                    const isOver = dragOverCell === cellKey;

                                    return (
                                        <td
                                            key={dIdx}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                                setDragOverCell(cellKey);
                                            }}
                                            onDragLeave={() => setDragOverCell(null)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragOverCell(null);
                                                // Drop onto open row marks it as open shift
                                                handleDropShift(employees[0]?.id || '', dateStr, true);
                                            }}
                                            style={{
                                                padding: '6px',
                                                verticalAlign: 'top',
                                                borderRight: dIdx < 6 ? '1px solid var(--color-border-subtle)' : 'none',
                                                background: isOver ? 'rgba(245,158,11,0.15)' : 'transparent',
                                                minHeight: '60px',
                                                outline: isOver ? '2px dashed #f59e0b' : 'none',
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {dayOpenShifts.map((s) => {
                                                    const roleStyle = ROLE_COLORS[s.role] || ROLE_COLORS.SERVER;
                                                    const startTimeFormatted = new Date(s.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    const endTimeFormatted = new Date(s.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                    return (
                                                        <div
                                                            key={s.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, s.id)}
                                                            style={{
                                                                backgroundColor: 'rgba(245,158,11,0.12)',
                                                                border: '1px dashed #f59e0b',
                                                                borderRadius: '4px',
                                                                padding: '6px 8px',
                                                                cursor: 'grab',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '11px', color: '#f59e0b' }}>
                                                                <span>{s.role}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleClaimShift(s.id);
                                                                    }}
                                                                    disabled={claimingShiftId === s.id}
                                                                    style={{
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        border: 'none',
                                                                        background: '#f59e0b',
                                                                        color: '#000',
                                                                        fontWeight: 800,
                                                                        fontSize: '9px',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    {claimingShiftId === s.id ? '...' : 'Claim'}
                                                                </button>
                                                            </div>
                                                            <div
                                                                onClick={() => openEditModal(s)}
                                                                style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '3px', cursor: 'pointer' }}
                                                            >
                                                                {startTimeFormatted} – {endTimeFormatted}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* ── Employee Rows ─────────────────────────────── */}
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        Loading weekly schedule...
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                        No staff members found in roster.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => {
                                    const empHours = shifts.filter(s => s.employeeId === emp.id).reduce((acc, s) => {
                                        const start = new Date(s.scheduledStart).getTime();
                                        const end = new Date(s.scheduledEnd).getTime();
                                        return acc + Math.max(0, (end - start) / (1000 * 60 * 60));
                                    }, 0);
                                    const isOvertime = empHours > 40;
                                    const weeklyCost = empHours * Number(emp.hourlyRate || 16.5);

                                    return (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            {/* Staff row label */}
                                            <td style={{ padding: '12px 14px', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg-card)', verticalAlign: 'top' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                                        {emp.user.name || 'Staff Member'}
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                                                        {empHours.toFixed(1)}h
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                                    <span>{emp.jobTitle || emp.user.role}</span>
                                                    <span>${weeklyCost.toFixed(0)}</span>
                                                </div>
                                                {isOvertime && (
                                                    <span
                                                        style={{
                                                            display: 'inline-block',
                                                            marginTop: '4px',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#ef4444',
                                                            fontSize: '10px',
                                                            fontWeight: 800,
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        }}
                                                    >
                                                        ⚠️ OT: +{(empHours - 40).toFixed(1)}h
                                                    </span>
                                                )}
                                            </td>

                                        {/* 7 Days */}
                                        {weekDays.map((d, dIdx) => {
                                            const dateStr = d.toISOString().substring(0, 10);
                                            const dayShifts = shifts.filter(s => {
                                                if (s.isOpen) return false;
                                                if (s.employeeId !== emp.id) return false;
                                                const sDate = new Date(s.scheduledStart).toISOString().substring(0, 10);
                                                return sDate === dateStr;
                                            });

                                            const isToday = new Date().toDateString() === d.toDateString();
                                            const cellKey = `${emp.id}_${dateStr}`;
                                            const isOver = dragOverCell === cellKey;

                                            return (
                                                <td
                                                    key={dIdx}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setDragOverCell(cellKey);
                                                    }}
                                                    onDragLeave={() => setDragOverCell(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setDragOverCell(null);
                                                        handleDropShift(emp.id, dateStr, false);
                                                    }}
                                                    style={{
                                                        padding: '6px',
                                                        verticalAlign: 'top',
                                                        borderRight: dIdx < 6 ? '1px solid var(--color-border-subtle)' : 'none',
                                                        background: isOver ? 'rgba(99,102,241,0.15)' : isToday ? 'rgba(99,102,241,0.03)' : 'transparent',
                                                        minHeight: '75px',
                                                        outline: isOver ? '2px dashed var(--color-text-primary)' : 'none',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {dayShifts.map((s) => {
                                                            const roleStyle = ROLE_COLORS[s.role] || ROLE_COLORS.SERVER;
                                                            const startTimeFormatted = new Date(s.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            const endTimeFormatted = new Date(s.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                            const hours = ((new Date(s.scheduledEnd).getTime() - new Date(s.scheduledStart).getTime()) / (1000 * 60 * 60)).toFixed(1);

                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, s.id)}
                                                                    onClick={() => openEditModal(s)}
                                                                    style={{
                                                                        backgroundColor: roleStyle.bg,
                                                                        borderLeft: `3px solid ${roleStyle.border}`,
                                                                        borderRadius: '4px',
                                                                        padding: '6px 8px',
                                                                        cursor: 'grab',
                                                                        transition: 'transform 0.1s ease',
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '11px', color: roleStyle.text }}>
                                                                        <span>{s.role}</span>
                                                                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{hours}h</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                                                                        {startTimeFormatted} – {endTimeFormatted}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Quick Add button */}
                                                        <button
                                                            onClick={() => openAddModal(emp.id, dateStr, false)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                borderRadius: '4px',
                                                                border: '1px dashed var(--color-border)',
                                                                background: 'transparent',
                                                                color: 'var(--color-text-tertiary)',
                                                                fontSize: '10px',
                                                                cursor: 'pointer',
                                                                marginTop: '2px',
                                                            }}
                                                        >
                                                            + Shift
                                                        </button>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Shift Modal (Create / Edit) ──────────────────────── */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '480px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-input)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                {editShift ? 'Edit Scheduled Shift' : 'Schedule New Shift'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '18px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveShift} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {modalError && (
                                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '12px' }}>
                                    ⚠️ {modalError}
                                </div>
                            )}

                            {/* Open Shift Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--color-bg-input)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        Open Shift
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                                        Allow eligible staff to claim this shift
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isOpenShift}
                                    onChange={(e) => setIsOpenShift(e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#f59e0b' }}
                                />
                            </div>

                            {/* Quick Presets */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Quick Shift Presets
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {DEFAULT_TEMPLATES.map((tpl, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => applyDefaultTemplate(tpl)}
                                            style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                                        >
                                            {tpl.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Assignee */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Assignee *
                                </label>
                                <select
                                    value={selectedEmpId}
                                    onChange={(e) => setSelectedEmpId(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'inherit', fontSize: '13px' }}
                                >
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.user.name || 'Staff'} ({emp.jobTitle || emp.user.role})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Role */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Active Role *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {(['SERVER', 'KITCHEN', 'MANAGER', 'OWNER'] as const).map(r => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setSelectedRole(r)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '6px',
                                                border: selectedRole === r ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                                                background: selectedRole === r ? '#4f46e5' : 'var(--color-bg-input)',
                                                color: selectedRole === r ? '#fff' : 'var(--color-text-secondary)',
                                                fontWeight: 700,
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Date</label>
                                    <input
                                        type="date"
                                        value={shiftDate}
                                        onChange={(e) => setShiftDate(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'inherit', fontSize: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Start</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'inherit', fontSize: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>End</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'inherit', fontSize: '12px' }}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                {editShift ? (
                                    <button
                                        type="button"
                                        onClick={handleDeleteShift}
                                        disabled={saving}
                                        style={{ color: '#ef4444', background: 'transparent', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        Delete Shift
                                    </button>
                                ) : <div />}

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                                    >
                                        {saving ? 'Saving...' : editShift ? 'Update Shift' : 'Save Shift'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Copy Week Modal ──────────────────────────────────── */}
            {isCopyModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '440px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-input)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                Copy Week Schedule
                            </h3>
                            <button
                                onClick={() => setIsCopyModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '18px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                Duplicate all shifts from a previous week into this target week (<b>{weekLabel}</b>) as unpublished drafts.
                            </p>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Source Week
                                </label>
                                <select
                                    value={sourceWeekOffset}
                                    onChange={(e) => setSourceWeekOffset(Number(e.target.value))}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-input)', color: 'inherit', fontSize: '13px' }}
                                >
                                    <option value={weekOffset - 1}>Previous Week ({weekOffset - 1 === 0 ? 'Current' : `${weekOffset - 1}w`})</option>
                                    <option value={weekOffset - 2}>2 Weeks Ago ({weekOffset - 2}w)</option>
                                    <option value={weekOffset - 3}>3 Weeks Ago ({weekOffset - 3}w)</option>
                                    <option value={weekOffset - 4}>4 Weeks Ago ({weekOffset - 4}w)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCopyModalOpen(false)}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCopyWeek}
                                    disabled={copyingWeek}
                                    style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                                >
                                    {copyingWeek ? 'Copying...' : 'Duplicate Schedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Shift Templates Modal ────────────────────────────── */}
            {isTemplateModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-input)' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                                    Shift Templates & Auto-Scheduling
                                </h3>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                    Save recurring shifts by day and role to instantiate onto any week
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTemplateModalOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '18px', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Create New Template Form */}
                            <form onSubmit={handleCreateTemplate} style={{ padding: '14px', background: 'var(--color-bg-input)', borderRadius: '10px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                    + Add Recurring Template
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                                    <input
                                        placeholder="Template Name (e.g. Dinner Cook)"
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, name: e.target.value }))}
                                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    />
                                    <select
                                        value={newTemplate.role}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, role: e.target.value as any }))}
                                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    >
                                        <option value="SERVER">SERVER</option>
                                        <option value="KITCHEN">KITCHEN</option>
                                        <option value="MANAGER">MANAGER</option>
                                        <option value="OWNER">OWNER</option>
                                    </select>
                                    <select
                                        value={newTemplate.dayOfWeek}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, dayOfWeek: Number(e.target.value) }))}
                                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    >
                                        <option value={1}>Monday</option>
                                        <option value={2}>Tuesday</option>
                                        <option value={3}>Wednesday</option>
                                        <option value={4}>Thursday</option>
                                        <option value={5}>Friday</option>
                                        <option value={6}>Saturday</option>
                                        <option value={0}>Sunday</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px' }}>
                                    <input
                                        type="time"
                                        value={newTemplate.startTime}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, startTime: e.target.value }))}
                                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    />
                                    <input
                                        type="time"
                                        value={newTemplate.endTime}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, endTime: e.target.value }))}
                                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    />
                                    <input
                                        placeholder="Station (opt)"
                                        value={newTemplate.station}
                                        onChange={(e) => setNewTemplate(t => ({ ...t, station: e.target.value }))}
                                        style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'inherit', fontSize: '12px' }}
                                    />
                                    <button
                                        type="submit"
                                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: 'var(--color-text-primary)', color: '#fff', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </form>

                            {/* Saved Templates List */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                        Saved Templates ({templates.length})
                                    </span>
                                    {templates.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleApplyTemplates}
                                            disabled={applyingTemplates}
                                            style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                                        >
                                            {applyingTemplates ? 'Applying...' : 'Apply to Current Week'}
                                        </button>
                                    )}
                                </div>

                                {loadingTemplates ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                                        Loading templates...
                                    </div>
                                ) : templates.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-tertiary)', fontSize: '12px', border: '1px dashed var(--color-border)', borderRadius: '8px' }}>
                                        No recurring templates saved yet. Create your first template above!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {templates.map(tpl => {
                                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                            const roleStyle = ROLE_COLORS[tpl.role] || ROLE_COLORS.SERVER;
                                            return (
                                                <div
                                                    key={tpl.id}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--color-border)',
                                                        background: 'var(--color-bg-card)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: roleStyle.bg, color: roleStyle.text, fontWeight: 800, fontSize: '10px' }}>
                                                            {tpl.role}
                                                        </span>
                                                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                                            {tpl.name}
                                                        </span>
                                                        {tpl.station && (
                                                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                                                                • {tpl.station}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                                        {days[tpl.dayOfWeek]}: {tpl.startTime} – {tpl.endTime}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ShiftSwapDrawer
                isOpen={isSwapDrawerOpen}
                onClose={() => setIsSwapDrawerOpen(false)}
                onSuccess={() => fetchScheduleData()}
            />
        </div>
    );
}
