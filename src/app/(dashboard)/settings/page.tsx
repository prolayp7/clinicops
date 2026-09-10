import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/permissions/policies";
import { getClinicSettings } from "@/server/services/clinic-settings-service";
import { listDepartments } from "@/server/services/departments-service";
import { listSpecializations } from "@/server/services/specializations-service";
import { listMedicines } from "@/server/services/medicines-service";
import { listLabTests } from "@/server/services/lab-tests-service";
import { listDocumentCategories } from "@/server/services/document-categories-service";
import { ClinicSettingsForm } from "./_components/clinic-settings-form";
import { LookupTableManager } from "./_components/lookup-table-manager";
import { MedicineTableManager } from "./_components/medicine-table-manager";
import { LabTestTableManager } from "./_components/lab-test-table-manager";
import {
  createDepartmentAction,
  createDocumentCategoryAction,
  createLabTestAction,
  createMedicineAction,
  createSpecializationAction,
  toggleDepartmentStatusAction,
  toggleDocumentCategoryStatusAction,
  toggleLabTestStatusAction,
  toggleMedicineStatusAction,
  toggleSpecializationStatusAction,
  updateDepartmentAction,
  updateDocumentCategoryAction,
  updateLabTestAction,
  updateMedicineAction,
  updateSpecializationAction,
} from "./actions";

const PAGE_SIZE = 10;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await getCurrentUser();
  if (!actor || !can(actor.profile.role, "settings:manage")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const deptSearch = params.deptSearch ?? "";
  const deptPage = Math.max(1, Number(params.deptPage) || 1);
  const specSearch = params.specSearch ?? "";
  const specPage = Math.max(1, Number(params.specPage) || 1);
  const medSearch = params.medSearch ?? "";
  const medPage = Math.max(1, Number(params.medPage) || 1);
  const labTestSearch = params.labTestSearch ?? "";
  const labTestPage = Math.max(1, Number(params.labTestPage) || 1);
  const docCatSearch = params.docCatSearch ?? "";
  const docCatPage = Math.max(1, Number(params.docCatPage) || 1);

  const [settings, departments, specializations, medicines, labTests, docCategories] = await Promise.all([
    getClinicSettings(),
    listDepartments({ search: deptSearch, page: deptPage, pageSize: PAGE_SIZE }),
    listSpecializations({ search: specSearch, page: specPage, pageSize: PAGE_SIZE }),
    listMedicines({ search: medSearch, page: medPage, pageSize: PAGE_SIZE }),
    listLabTests({ search: labTestSearch, page: labTestPage, pageSize: PAGE_SIZE }),
    listDocumentCategories({ search: docCatSearch, page: docCatPage, pageSize: PAGE_SIZE }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-page-title text-foreground font-bold">Settings</h1>
        <p className="text-muted-foreground text-body">
          Clinic profile and the master data used across doctor and scheduling forms.
        </p>
      </div>

      <Tabs defaultValue="clinic">
        <TabsList>
          <TabsTrigger value="clinic">Clinic</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="specializations">Specializations</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="document-categories">Document Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic">
          <Card className="p-6">
            <ClinicSettingsForm initial={settings} />
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card className="p-6">
            <LookupTableManager
              label="Department"
              items={departments.items}
              total={departments.total}
              page={deptPage}
              pageSize={PAGE_SIZE}
              search={deptSearch}
              searchParamKey="deptSearch"
              canManage
              onCreate={createDepartmentAction}
              onUpdate={updateDepartmentAction}
              onToggleStatus={toggleDepartmentStatusAction}
            />
          </Card>
        </TabsContent>

        <TabsContent value="specializations">
          <Card className="p-6">
            <LookupTableManager
              label="Specialization"
              items={specializations.items}
              total={specializations.total}
              page={specPage}
              pageSize={PAGE_SIZE}
              search={specSearch}
              searchParamKey="specSearch"
              canManage
              onCreate={createSpecializationAction}
              onUpdate={updateSpecializationAction}
              onToggleStatus={toggleSpecializationStatusAction}
            />
          </Card>
        </TabsContent>

        <TabsContent value="medicines">
          <Card className="p-6">
            <MedicineTableManager
              items={medicines.items}
              total={medicines.total}
              page={medPage}
              pageSize={PAGE_SIZE}
              search={medSearch}
              canManage
              onCreate={createMedicineAction}
              onUpdate={updateMedicineAction}
              onToggleStatus={toggleMedicineStatusAction}
            />
          </Card>
        </TabsContent>

        <TabsContent value="lab-tests">
          <Card className="p-6">
            <LabTestTableManager
              items={labTests.items}
              total={labTests.total}
              page={labTestPage}
              pageSize={PAGE_SIZE}
              search={labTestSearch}
              canManage
              onCreate={createLabTestAction}
              onUpdate={updateLabTestAction}
              onToggleStatus={toggleLabTestStatusAction}
            />
          </Card>
        </TabsContent>

        <TabsContent value="document-categories">
          <Card className="p-6">
            <LookupTableManager
              label="Category"
              items={docCategories.items}
              total={docCategories.total}
              page={docCatPage}
              pageSize={PAGE_SIZE}
              search={docCatSearch}
              searchParamKey="docCatSearch"
              canManage
              onCreate={createDocumentCategoryAction}
              onUpdate={updateDocumentCategoryAction}
              onToggleStatus={toggleDocumentCategoryStatusAction}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
