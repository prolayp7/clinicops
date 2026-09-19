-- AlterTable
ALTER TABLE "patient_accounts" ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "staff_profiles" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "staff_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "staffId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "patientAccountId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_sessions_tokenHash_key" ON "staff_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "staff_sessions_staffId_idx" ON "staff_sessions"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_sessions_tokenHash_key" ON "patient_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "patient_sessions_patientAccountId_idx" ON "patient_sessions"("patientAccountId");

-- AddForeignKey
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_sessions" ADD CONSTRAINT "patient_sessions_patientAccountId_fkey" FOREIGN KEY ("patientAccountId") REFERENCES "patient_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

