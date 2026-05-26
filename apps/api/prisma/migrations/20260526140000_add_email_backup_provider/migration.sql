-- Add EMAIL provider to BackupProvider enum
ALTER TYPE "BackupProvider" ADD VALUE IF NOT EXISTS 'EMAIL';
