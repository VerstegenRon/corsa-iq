-- Labels Claude derives from the driver's feedback (handling, corners, phases of the corner, topics),
-- so feedback can be shown as chips and filtered. Null when there is no feedback or tagging failed.
alter table public.sessions add column feedback_tags jsonb;
