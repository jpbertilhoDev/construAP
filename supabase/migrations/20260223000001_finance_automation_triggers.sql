-- ============================================================
-- Migration: 20260223000001_finance_automation_triggers
-- ConstruAP — Triggers para Automação do Módulo Financeiro
-- ============================================================

-- 1. COSTS -> ACCOUNTS_PAYABLE
-- Quando um custo real é "Aprovado", criamos automaticamente uma conta a pagar

CREATE OR REPLACE FUNCTION trg_cost_approval_creates_ap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Se passou de outro estado (ou recém-criado) para 'Aprovado'
    IF NEW.status = 'Aprovado' AND (TG_OP = 'INSERT' OR OLD.status != 'Aprovado') THEN
        
        -- Verifica se já existe um AP para este custo (segurança dupla)
        IF NOT EXISTS (SELECT 1 FROM accounts_payable WHERE cost_id = NEW.id) THEN
            INSERT INTO accounts_payable (
                tenant_id,
                obra_id,
                supplier_id,
                cost_id,
                description,
                amount,
                due_date,
                status,
                created_by
            ) VALUES (
                NEW.tenant_id,
                NEW.obra_id,
                NEW.supplier_id,
                NEW.id,
                NEW.description,
                NEW.amount,
                COALESCE(NEW.cost_date, CURRENT_DATE), -- Usamos cost_date como due_date inicial
                'Pendente',
                NEW.created_by
            );
        END IF;

    -- Se um custo aprovado for 'Anulado' ou revertido para 'Rascunho', cancelamos o AP correspondente
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Aprovado' AND NEW.status != 'Aprovado' THEN
        UPDATE accounts_payable
        SET status = 'Cancelado'
        WHERE cost_id = NEW.id AND status = 'Pendente';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_costs_to_ap ON costs;
CREATE TRIGGER trg_costs_to_ap
    AFTER INSERT OR UPDATE OF status ON costs
    FOR EACH ROW EXECUTE FUNCTION trg_cost_approval_creates_ap();


-- 2. ACCOUNTS_PAYABLE -> FINANCIAL_TRANSACTIONS
-- Quando um AP passa a "Pago", criamos a transação financeira para sair do Caixa

CREATE OR REPLACE FUNCTION trg_ap_payment_creates_tx()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Se o AP foi marcado como 'Pago'
    IF NEW.status = 'Pago' AND (TG_OP = 'INSERT' OR OLD.status != 'Pago') THEN
        
        -- Garante que não duplica a transação
        IF NOT EXISTS (SELECT 1 FROM financial_transactions WHERE ap_id = NEW.id) THEN
            INSERT INTO financial_transactions (
                tenant_id,
                ap_id,
                ar_id,
                amount,
                transaction_date,
                method,
                notes,
                created_by
            ) VALUES (
                NEW.tenant_id,
                NEW.id,
                NULL,
                NEW.amount,
                CURRENT_DATE,
                'Transferência', -- Valor por omissão
                'Pagamento gerado automaticamente',
                NEW.created_by
            );
        END IF;

    -- Se por acaso for revertido de 'Pago' para 'Pendente', removemos a transação
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Pago' AND NEW.status != 'Pago' THEN
        DELETE FROM financial_transactions WHERE ap_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ap_to_tx ON accounts_payable;
CREATE TRIGGER trg_ap_to_tx
    AFTER INSERT OR UPDATE OF status ON accounts_payable
    FOR EACH ROW EXECUTE FUNCTION trg_ap_payment_creates_tx();


-- 3. ACCOUNTS_RECEIVABLE -> FINANCIAL_TRANSACTIONS
-- Quando um AR passa a "Pago", criamos a transação financeira para entrar no Caixa

CREATE OR REPLACE FUNCTION trg_ar_receipt_creates_tx()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Se o AR foi marcado como 'Pago'
    IF NEW.status = 'Pago' AND (TG_OP = 'INSERT' OR OLD.status != 'Pago') THEN
        
        -- Garante que não duplica a transação
        IF NOT EXISTS (SELECT 1 FROM financial_transactions WHERE ar_id = NEW.id) THEN
            INSERT INTO financial_transactions (
                tenant_id,
                ap_id,
                ar_id,
                amount,
                transaction_date,
                method,
                notes,
                created_by
            ) VALUES (
                NEW.tenant_id,
                NULL,
                NEW.id,
                NEW.amount,
                CURRENT_DATE,
                'Transferência', -- Valor por omissão
                'Recebimento gerado automaticamente',
                NEW.created_by
            );
        END IF;

    -- Se por acaso for revertido de 'Pago' para 'Pendente', removemos a transação
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Pago' AND NEW.status != 'Pago' THEN
        DELETE FROM financial_transactions WHERE ar_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ar_to_tx ON accounts_receivable;
CREATE TRIGGER trg_ar_to_tx
    AFTER INSERT OR UPDATE OF status ON accounts_receivable
    FOR EACH ROW EXECUTE FUNCTION trg_ar_receipt_creates_tx();
