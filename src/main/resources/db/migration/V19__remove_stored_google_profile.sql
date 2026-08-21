UPDATE users
SET display_name = NULL,
    avatar_url = NULL
WHERE display_name IS NOT NULL
   OR avatar_url IS NOT NULL;
