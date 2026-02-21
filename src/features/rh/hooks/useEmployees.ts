import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchEmployeeRoles, createEmployeeRole, deleteEmployeeRole,
    fetchEmployees, fetchEmployee, createEmployee, updateEmployee,
    fetchEmployeeRates, createEmployeeRate,
    fetchAllocations, createAllocation, updateAllocation, deleteAllocation,
    fetchTimesheets, createTimesheet, approveTimesheet, rejectTimesheet, updateTimesheet, deleteTimesheet,
    uploadAvatar
} from '@/services/employees'
import type { Employee, EmployeeRate, Allocation } from '@/services/employees'

const ROLES_KEY = ['employee_roles']
const EMPLOYEES_KEY = ['employees']
const RATES_KEY = (id: string) => ['employee_rates', id]
const ALLOCATIONS_KEY = (f?: object) => ['allocations', f ?? {}]
const TIMESHEETS_KEY = (f?: object) => ['timesheets', f ?? {}]

// ── Employee Roles ─────────────────────────────────────────────────────────────

export function useEmployeeRoles() {
    return useQuery({ queryKey: ROLES_KEY, queryFn: fetchEmployeeRoles })
}

export function useCreateEmployeeRole() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createEmployeeRole>[0]) => createEmployeeRole(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
    })
}

export function useDeleteEmployeeRole() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteEmployeeRole(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ROLES_KEY }),
    })
}

// ── Employees ──────────────────────────────────────────────────────────────────

export function useEmployees(includeInactive = false) {
    return useQuery({
        queryKey: [...EMPLOYEES_KEY, { includeInactive }],
        queryFn: () => fetchEmployees(includeInactive),
    })
}

export function useEmployee(id: string) {
    return useQuery({
        queryKey: [...EMPLOYEES_KEY, id],
        queryFn: () => fetchEmployee(id),
        enabled: !!id,
    })
}

export function useCreateEmployee() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createEmployee>[0]) => createEmployee(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: EMPLOYEES_KEY }),
    })
}

export function useUpdateEmployee() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...payload }: { id: string } & Partial<Employee>) => updateEmployee(id, payload),
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: EMPLOYEES_KEY })
            qc.invalidateQueries({ queryKey: [...EMPLOYEES_KEY, v.id] })
        },
    })
}

export function useUploadAvatar() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ employeeId, file }: { employeeId: string; file: File }) => uploadAvatar(employeeId, file),
        onSuccess: (_d, v) => {
            qc.invalidateQueries({ queryKey: EMPLOYEES_KEY })
            qc.invalidateQueries({ queryKey: [...EMPLOYEES_KEY, v.employeeId] })
        },
    })
}

// ── Employee Rates ─────────────────────────────────────────────────────────────

export function useEmployeeRates(employeeId: string) {
    return useQuery({
        queryKey: RATES_KEY(employeeId),
        queryFn: () => fetchEmployeeRates(employeeId),
        enabled: !!employeeId,
    })
}

export function useCreateEmployeeRate(employeeId: string) {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Omit<EmployeeRate, 'id' | 'tenant_id' | 'created_at'>) => createEmployeeRate(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: RATES_KEY(employeeId) }),
    })
}

// ── Allocations ────────────────────────────────────────────────────────────────

export function useAllocations(filters: { employee_id?: string; obra_id?: string } = {}) {
    return useQuery({
        queryKey: ALLOCATIONS_KEY(filters),
        queryFn: () => fetchAllocations(filters),
    })
}

export function useCreateAllocation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createAllocation>[0]) => createAllocation(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: ALLOCATIONS_KEY() }),
    })
}

export function useUpdateAllocation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...p }: { id: string } & Partial<Allocation>) => updateAllocation(id, p),
        onSuccess: () => qc.invalidateQueries({ queryKey: ALLOCATIONS_KEY() }),
    })
}

export function useDeleteAllocation() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteAllocation(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ALLOCATIONS_KEY() }),
    })
}

// ── Timesheets ─────────────────────────────────────────────────────────────────

export function useTimesheets(filters: Parameters<typeof fetchTimesheets>[0] = {}) {
    return useQuery({
        queryKey: TIMESHEETS_KEY(filters),
        queryFn: () => fetchTimesheets(filters),
    })
}

export function useCreateTimesheet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (p: Parameters<typeof createTimesheet>[0]) => createTimesheet(p),
        onSuccess: () => qc.invalidateQueries({ queryKey: TIMESHEETS_KEY() }),
    })
}

export function useApproveTimesheet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => approveTimesheet(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: TIMESHEETS_KEY() }),
    })
}

export function useRejectTimesheet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) => rejectTimesheet(id, motivo),
        onSuccess: () => qc.invalidateQueries({ queryKey: TIMESHEETS_KEY() }),
    })
}

export function useUpdateTimesheet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, ...p }: { id: string } & Parameters<typeof updateTimesheet>[1]) => updateTimesheet(id, p),
        onSuccess: () => qc.invalidateQueries({ queryKey: TIMESHEETS_KEY() }),
    })
}

export function useDeleteTimesheet() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => deleteTimesheet(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: TIMESHEETS_KEY() }),
    })
}
