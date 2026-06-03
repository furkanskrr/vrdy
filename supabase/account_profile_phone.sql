-- Şifre sıfırlama uygulamada yalnızca e-posta ile (Supabase Auth resetPasswordForEmail).
-- Twilio / recovery_route kullanılmıyor. Daha önce oluşturduysanız RPC'yi kaldırın:

drop function if exists public.recovery_route(text);

-- Not: profiles tablosunda phone / phone_verified_at sütunları kaldıysa zararsız; istemci okumaz.
