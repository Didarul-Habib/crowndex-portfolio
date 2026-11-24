-- In Supabase Dashboard > Authentication > Users, create or invite your admin user.
-- Then replace the quoted placeholder with that EXACT user's email and run this SQL.
-- Never paste an admin password into SQL.

insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL@EXAMPLE.COM')
on conflict (user_id) do nothing;

-- Check that exactly your authorized account is listed:
select a.user_id, u.email, a.created_at
from public.admin_users a
join auth.users u on u.id = a.user_id;
