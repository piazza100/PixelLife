ALTER TABLE boards DROP FOREIGN KEY fk_boards_user;
ALTER TABLE boards
  ADD CONSTRAINT fk_boards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
