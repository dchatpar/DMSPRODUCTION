-- Insert the admin user into your users table
INSERT INTO users (
    id,
    full_name,
    role,
    email,
    phone,
    password_hash,
    start_date,
    created_at,
    updated_at
) VALUES (
    'e23c839d-6e85-421d-bae8-4c9ebecbbd1c',  -- Your user ID from login response
    'Admin User',
    'Admin',  -- Setting as Admin role
    'admin@gmail.com',
    '',  -- Phone (add if you have it)
    'managed_by_auth',
    CURRENT_DATE,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE 
SET 
    role = 'Admin',
    full_name = 'Admin User',
    updated_at = NOW();

-- Verify the user was added
SELECT * FROM users WHERE email = 'admin@gmail.com';