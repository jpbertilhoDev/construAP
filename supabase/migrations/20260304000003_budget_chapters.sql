-- 1. Create the budget_chapters table
CREATE TABLE IF NOT EXISTS public.budget_chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add Row Level Security (RLS) policies for tenant isolation
ALTER TABLE public.budget_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget_chapters of their tenant" 
    ON public.budget_chapters FOR SELECT 
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert budget_chapters in their tenant" 
    ON public.budget_chapters FOR INSERT 
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update budget_chapters of their tenant" 
    ON public.budget_chapters FOR UPDATE 
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete budget_chapters of their tenant" 
    ON public.budget_chapters FOR DELETE 
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Create the missing foreign key from budget_items to budget_chapters
-- Since chapter_id already exists from the original setup, we just add the constraint.
ALTER TABLE public.budget_items
    ADD CONSTRAINT fk_budget_items_chapter 
    FOREIGN KEY (chapter_id) 
    REFERENCES public.budget_chapters(id) 
    ON DELETE SET NULL;

-- 4. Enable triggers for updated_at
CREATE TRIGGER set_budget_chapters_updated_at
    BEFORE UPDATE ON public.budget_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Add useful indexes
CREATE INDEX IF NOT EXISTS idx_budget_chapters_budget_id ON public.budget_chapters(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_chapters_tenant_id ON public.budget_chapters(tenant_id);
