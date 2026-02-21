import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    type TaskInsert,
} from '@/services/tasks'

export function useTasks(obraId: string) {
    return useQuery({
        queryKey: ['tasks', obraId],
        queryFn: () => fetchTasks(obraId),
        enabled: !!obraId,
    })
}

export function useCreateTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', data.obra_id] })
        },
    })
}

export function useUpdateTask(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskInsert> }) =>
            updateTask(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', obraId] })
        },
    })
}

export function useDeleteTask(obraId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', obraId] })
        },
    })
}
