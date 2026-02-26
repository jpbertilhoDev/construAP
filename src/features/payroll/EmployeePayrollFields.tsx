import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
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
import { useEmployee, useUpdateEmployee } from '@/features/rh/hooks/useEmployees'

interface Props {
    employeeId: string
}

interface PayrollFormValues {
    situacao_fiscal: 'solteiro' | 'casado_2_titulares' | 'casado_unico_titular'
    numero_dependentes: number
    niss: string
    iban: string
}

export function EmployeePayrollFields({ employeeId }: Props) {
    const { data: employee, isLoading } = useEmployee(employeeId)
    const updateMutation = useUpdateEmployee()

    const form = useForm<PayrollFormValues>({
        defaultValues: {
            situacao_fiscal: 'solteiro',
            numero_dependentes: 0,
            niss: '',
            iban: '',
        },
    })

    useEffect(() => {
        if (employee) {
            form.reset({
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- column may not exist before migration
                situacao_fiscal: employee.situacao_fiscal || 'solteiro',
                numero_dependentes: employee.numero_dependentes || 0,
                niss: employee.niss ?? '',
                iban: employee.iban ?? '',
            })
        }
    }, [employee, form])

    const onSubmit = async (values: PayrollFormValues) => {
        try {
            await updateMutation.mutateAsync({
                id: employeeId,
                ...values,
            })
            toast.success('Dados fiscais guardados com sucesso')
        } catch {
            toast.error('Erro ao guardar dados fiscais')
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Dados Fiscais</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dados Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
                    className="space-y-4"
                >
                    <div className="grid grid-cols-2 gap-4">
                        {/* Situação Fiscal */}
                        <div className="space-y-1">
                            <Label className="text-xs">Situação Fiscal</Label>
                            <Select
                                onValueChange={(val) => {
                                    form.setValue('situacao_fiscal', val as PayrollFormValues['situacao_fiscal'])
                                }}
                                value={form.watch('situacao_fiscal')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="solteiro">
                                        Solteiro/a
                                    </SelectItem>
                                    <SelectItem value="casado_2_titulares">
                                        Casado - 2 Titulares
                                    </SelectItem>
                                    <SelectItem value="casado_unico_titular">
                                        Casado - Único Titular
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Número de Dependentes */}
                        <div className="space-y-1">
                            <Label className="text-xs">Número de Dependentes</Label>
                            <Input
                                type="number"
                                min={0}
                                step={1}
                                {...form.register('numero_dependentes', {
                                    valueAsNumber: true,
                                })}
                            />
                        </div>

                        {/* NISS */}
                        <div className="space-y-1">
                            <Label className="text-xs">NISS</Label>
                            <Input
                                type="text"
                                placeholder="Nº Identificação Segurança Social"
                                {...form.register('niss')}
                            />
                        </div>

                        {/* IBAN */}
                        <div className="space-y-1">
                            <Label className="text-xs">IBAN</Label>
                            <Input
                                type="text"
                                placeholder="PT50..."
                                {...form.register('iban')}
                            />
                        </div>
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
                            'Guardar'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
