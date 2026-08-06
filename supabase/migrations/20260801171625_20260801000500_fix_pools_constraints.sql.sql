/*
# Fix pools constraint ordering

The old pools_status_check only allows 'active','completed'. We need to:
1. Drop the old constraint
2. Migrate data ('active' -> 'open', 'completed' -> 'final')
3. Add the new constraint with the full product status set

Also drop selection_mode check so 'host' can be added later.
*/

ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_status_check;
ALTER TABLE pools DROP CONSTRAINT IF EXISTS pools_selection_mode_check;

UPDATE pools SET status = 'open' WHERE status = 'active';
UPDATE pools SET status = 'final' WHERE status = 'completed';

ALTER TABLE pools ADD CONSTRAINT pools_status_check
  CHECK (status IN ('draft','open','full','locked','in_progress','final','completed','canceled'));
ALTER TABLE pools ADD CONSTRAINT pools_selection_mode_check
  CHECK (selection_mode IN ('pick','random','host'));
