import { supabase } from '@/lib/supabase'

export type AppDocument = {
    id: string
    obra_id: string
    tenant_id: string
    name: string
    category: string
    version: number
    storage_path: string
    mime_type: string | null
    size_bytes: number | null
    uploaded_by: string
    created_at: string
    profiles?: { name: string } | null
}

export async function fetchDocumentsByObra(obraId: string): Promise<AppDocument[]> {
    const { data, error } = await supabase
        .from('documents')
        .select(`
            *,
            profiles(name)
        `)
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as unknown as AppDocument[]) ?? []
}

export async function createDocument(
    obraId: string,
    file: File,
    name: string,
    category: string = 'Geral'
): Promise<AppDocument> {
    const { data: profileData } = await supabase.from('profiles').select('id, tenant_id').single()
    const profile = profileData as { id: string; tenant_id: string } | null
    if (!profile) throw new Error('Perfil não encontrado')

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const safeName = name.replace(/[^a-zA-Z0-9-]/g, '_')
    const fileName = `${Date.now()}_${safeName}.${fileExt}`
    const storagePath = `${profile.tenant_id}/${obraId}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

    // 2. Insert into relational database
    const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
            obra_id: obraId,
            tenant_id: profile.tenant_id,
            name: name,
            category: category,
            storage_path: storagePath,
            mime_type: file.type || null,
            size_bytes: file.size,
            uploaded_by: profile.id,
        } as unknown as never)
        .select()
        .single()

    if (insertError) {
        // Rollback upload if DB insert fails
        await supabase.storage.from('documentos').remove([storagePath])
        throw new Error(`Erro ao registar documento: ${insertError.message}`)
    }

    return data as unknown as AppDocument
}

export async function deleteDocument(id: string, storagePath: string): Promise<void> {
    // 1. Delete from DB
    const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

    if (dbError) throw new Error(dbError.message)

    // 2. Delete from Storage
    const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([storagePath])

    if (storageError) console.error('Error deleting file from storage:', storageError.message)
    // We don't throw here to avoid failing the DB deletion if storage cleanup fails
}

export async function getDocumentUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(storagePath, 3600) // 1 hour

    if (error) throw new Error(error.message)
    return data.signedUrl
}
