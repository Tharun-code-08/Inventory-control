-- CreateEnum
CREATE TYPE "ScanSource" AS ENUM ('WEB', 'MOBILE', 'USB_SCANNER', 'CAMERA', 'API');

-- AlterTable
ALTER TABLE "scan_logs" ADD COLUMN "source" "ScanSource" NOT NULL DEFAULT 'API';
