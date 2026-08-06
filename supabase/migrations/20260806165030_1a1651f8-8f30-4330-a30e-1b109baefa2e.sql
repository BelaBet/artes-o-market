
-- Pedidos: artesão envolvido só altera status/notes
CREATE OR REPLACE FUNCTION public.pedido_artesao_so_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin() OR OLD.buyer_user_id = auth.uid() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.pedido_tem_item_meu(OLD.id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.number IS DISTINCT FROM OLD.number
       OR NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id
       OR NEW.buyer_email IS DISTINCT FROM OLD.buyer_email
       OR NEW.buyer_name IS DISTINCT FROM OLD.buyer_name
       OR NEW.buyer_phone IS DISTINCT FROM OLD.buyer_phone
       OR NEW.buyer_document IS DISTINCT FROM OLD.buyer_document
       OR NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
       OR NEW.shipping_cents IS DISTINCT FROM OLD.shipping_cents
       OR NEW.discount_cents IS DISTINCT FROM OLD.discount_cents
       OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.shipping_zipcode IS DISTINCT FROM OLD.shipping_zipcode
       OR NEW.shipping_street IS DISTINCT FROM OLD.shipping_street
       OR NEW.shipping_number IS DISTINCT FROM OLD.shipping_number
       OR NEW.shipping_complement IS DISTINCT FROM OLD.shipping_complement
       OR NEW.shipping_district IS DISTINCT FROM OLD.shipping_district
       OR NEW.shipping_city IS DISTINCT FROM OLD.shipping_city
       OR NEW.shipping_state IS DISTINCT FROM OLD.shipping_state
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.pagarme_order_id IS DISTINCT FROM OLD.pagarme_order_id
       OR NEW.pagarme_charge_id IS DISTINCT FROM OLD.pagarme_charge_id
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'O artesão só pode atualizar o status do pedido';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_artesao_so_status ON public.orders;
CREATE TRIGGER orders_artesao_so_status
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.pedido_artesao_so_status();

-- Mensagens: participantes só marcam como lida
CREATE OR REPLACE FUNCTION public.mensagem_so_marca_lida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Só é permitido marcar a mensagem como lida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_so_marca_lida ON public.messages;
CREATE TRIGGER messages_so_marca_lida
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mensagem_so_marca_lida();

REVOKE ALL ON FUNCTION public.pedido_artesao_so_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mensagem_so_marca_lida() FROM PUBLIC, anon, authenticated;
