import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { usePayrollConfig, useUpdatePayrollConfig } from './hooks/usePayroll'

interface ConfigFormValues {
    ss_taxa_entidade: number
    ss_taxa_trabalhador: number
    subsidio_alimentacao_valor: number
    subsidio_alimentacao_tipo: 'cash' | 'card'
    overtime_1h: number
    overtime_subsequent: number
    overtime_rest_day: number
    overtime_holiday: number
    horas_diarias_padrao: number
}

export function PayrollConfigDialog({
    open,
    onOpenChange,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const { data: config, isLoading } = usePayrollConfig()
    const updateMutation = useUpdatePayrollConfig()

    const form = useForm<ConfigFormValues>({
        defaultValues: {
            ss_taxa_entidade: 23.75,
            ss_taxa_trabalhador: 11,
            subsidio_alimentacao_valor: 6,
            subsidio_alimentacao_tipo: 'cash',
            overtime_1h: 1.25,
            overtime_subsequent: 1.375,
            overtime_rest_day: 1.5,
            overtime_holiday: 2,
            horas_diarias_padrao: 8,
        },
    })

    useEffect(() => {
        if (config) {
            form.reset({
                ss_taxa_entidade: config.ss_taxa_entidade,
                ss_taxa_trabalhador: config.ss_taxa_trabalhador,
                subsidio_alimentacao_valor: config.subsidio_alimentacao_valor,
                subsidio_alimentacao_tipo: config.subsidio_alimentacao_tipo,
                overtime_1h: config.overtime_1h,
                overtime_subsequent: config.overtime_subsequent,
                overtime_rest_day: config.overtime_rest_day,
                overtime_holiday: config.overtime_holiday,
                horas_diarias_padrao: config.horas_diarias_padrao,
            })
        }
    }, [config, form])

    const onSubmit = async (values: ConfigFormValues) => {
        await updateMutation.mutateAsync(values)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configuração Salarial</DialogTitle>
                    <DialogDescription>
                        Taxas e parâmetros para o processamento de salários.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <form
                        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                        className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
                    >
                        {/* Segurança Social */}
                        <fieldset className="space-y-3 border rounded-md p-3">
                            <legend className="text-sm font-semibold px-1">
                                Segurança Social
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Taxa Entidade (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('ss_taxa_entidade', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Taxa Trabalhador (%)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('ss_taxa_trabalhador', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Subsídio Alimentação */}
                        <fieldset className="space-y-3 border rounded-md p-3">
                            <legend className="text-sm font-semibold px-1">
                                Subsídio de Alimentação
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Valor Diário (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...form.register('subsidio_alimentacao_valor', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Tipo</Label>
                                    <Select
                                        onValueChange={(val) => {
                                            form.setValue(
                                                'subsidio_alimentacao_tipo',
                                                val as 'cash' | 'card',
                                            )
                                        }}
                                        defaultValue={form.getValues('subsidio_alimentacao_tipo')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Dinheiro</SelectItem>
                                            <SelectItem value="card">Cartão Refeição</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </fieldset>

                        {/* Horas Extra */}
                        <fieldset className="space-y-3 border rounded-md p-3">
                            <legend className="text-sm font-semibold px-1">
                                Multiplicadores Horas Extra
                            </legend>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">1ª Hora (×)</Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        {...form.register('overtime_1h', { valueAsNumber: true })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Horas Seguintes (×)</Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        {...form.register('overtime_subsequent', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Descanso Semanal (×)</Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        {...form.register('overtime_rest_day', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Feriado (×)</Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        {...form.register('overtime_holiday', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                </div>
                            </div>
                        </fieldset>

                        {/* Horas Padrão */}
                        <div className="space-y-1">
                            <Label className="text-xs">Horas Diárias Padrão</Label>
                            <Input
                                type="number"
                                step="0.5"
                                className="w-32"
                                {...form.register('horas_diarias_padrao', {
                                    valueAsNumber: true,
                                })}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Guardar...
                                </span>
                            ) : (
                                'Guardar Configuração'
                            )}
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
