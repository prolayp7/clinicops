-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

