# Release operations and admin handover

Status: runbook prepared; no production deployment, migration application, restore drill, monitoring setup or credential handover has been performed by this review. Use synthetic records on a confirmed isolated staging project. Do not run demo seed against production.

## Environment and deployment

Use separate staging and production Supabase projects and deployment environments. Provision secrets in the hosting secret manager; never copy .env or supabase_creds.md into artifacts. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are public project identifiers; SUPABASE_SERVICE_ROLE_KEY bypasses RLS and must stay server-only. DATABASE_URL is the runtime database connection; DIRECT_URL is the direct migration/backup connection. CLINIC_TIMEZONE must agree with ClinicSetting.timezone. E2E_SEED_PASSWORD and ALLOW_DEMO_SEED=true are staging-only. Rotate demo passwords before any real rollout; do not use seeded staff in production.

1. Record the reviewed commit, environment, operator and rollback owner. Resolve every blocker in RELEASE_READINESS.md before approving deployment.
2. Install the lockfile with npm ci on Node 20+; run npm run typecheck, npm run lint, npm test, npm run build and npm run test:e2e. Browser prerequisites: npx playwright install --with-deps chromium. Full journey and authenticated role matrix remain required beyond the current browser smoke tests.
3. On an empty isolated database run npx prisma migrate deploy, then npx prisma migrate status. Never run migrate dev/reset on production. Check migration SQL for locks, destructive changes and extension permissions. Existing migrations contain cascading dependent-record foreign keys; runtime DB privileges must prohibit unauthorized destructive operations.
4. Take and verify a backup before applying reviewed migrations to production with npx prisma migrate deploy. Stop if schema drift or failed migrations appear. Do not resolve failed migrations as applied without proving the schema state.
5. Deploy the reviewed build to the staging URL, configure Supabase site URL/allowed redirects and HTTPS, and test session expiry, login/logout, release PDFs and private downloads. Run the same smoke checks after production deployment. Vercel environment values must be set before building public configuration.
6. Roll back application code only if it remains compatible with the migrated schema. Prefer forward fixes for data migrations. A database restore requires an approved outage and explicit target verification; never restore over the live database as a casual rollback.

## Private storage

Provision these four buckets before uploads: consultation-attachments, doctor-signatures, lab-reports, patient-documents. All must have public=false. Upload/download helpers now reject missing/public buckets instead of silently provisioning them. Allow only PDF/JPEG/PNG and 10 MiB, with JPEG/PNG and 2 MiB for signatures. Application validation additionally checks extension, nonzero size and file signature. This is not malware scanning.

Review storage.objects RLS: anon and authenticated clients must have no direct SELECT/INSERT/UPDATE/DELETE access to these buckets. Server-only service-role operations perform application authorization before signing. Audit any pre-existing broad policies; a private bucket alone does not establish correct RLS. Use random object names and never publish bucket URLs. Signed links expire after 600 seconds but remain bearer credentials during that interval; revoking application access does not revoke an already issued link.

Staging verification: upload a synthetic PDF through an allowed staff workflow; prove direct anonymous and authenticated object reads fail; prove unrelated doctor/patient access fails before signing; prove own released access succeeds and archived access fails; wait past expiry and prove the URL fails. Verify each bucket separately. Record results without document contents or signed URLs.

## Headers, rate limiting and sessions

next.config.mjs sets nosniff, DENY frame policy, no-referrer, HSTS, restricted Permissions-Policy and CSP. CSP permits unsafe-eval only when NODE_ENV=development for React debugging; production and test do not allow eval. CSP currently allows inline scripts/styles for Next rendering; a nonce policy is a remaining hardening item. Verify PDF preview and Supabase traffic on the actual deployed domain. HSTS includeSubDomains requires HTTPS on all subdomains.

No application-wide distributed rate limiter is implemented. Before release configure and test limits for staff/portal authentication, password recovery, portal appointment requests and signed-download generation. Supabase Auth provider limits alone do not cover server actions or document URL generation. Use a shared store or hosting WAF, not per-process counters; document the key, window, thresholds, Retry-After and provider outage behavior. Password reset UI/flow is currently missing. Verify cookie flags/session expiration in staging and require MFA for privileged operational accounts according to clinic policy.

## Monitoring and audit

No Sentry integration/alert routing is present. Configure a server-side error sink with PII disabled, request bodies/cookies/authorization/query parameters removed, and session replay disabled. Never capture patient pages, clinical notes, uploaded files or signed URLs. Use a synthetic error to verify notification delivery and document the on-call owner. Track error rate, latency, DB pool saturation, backup failures and storage failures with non-identifying metrics.

Prisma query/error logging is disabled to avoid parameter leakage. The reminder sender fails until a provider exists and never logs appointment details. AuditLog writes are append-only in application behavior; database permissions/retention/tamper controls still need verification. Authentication and document-access audit events are incomplete. Do not treat the current audit coverage as complete. Reminder jobs are prepared, but provider delivery/scheduling is not operational.

## Backup and restore drill

Assign backup owner, retention, RPO and RTO before launch. Verify automated database backups in the provider console and alert on failures. Database backups do not replace a separate inventory/backup of private Storage objects; track database references and object versions consistently. Store backups encrypted with restricted access and audited retrieval.

For a manual drill use pg_dump --format=custom with a secure connection service/PGPASSFILE; do not put passwords in command arguments or logs. Restore with pg_restore --no-owner --no-acl into a NEW isolated target, never the source. Capture start/end time, schema/migration versions and non-identifying record counts; verify constraints, totals, audit history, synthetic login and signed file retrieval against the restored objects. Measure achieved RPO/RTO and have the backup owner sign the result. Securely dispose of the drill environment under the retention policy. No restore drill has been executed here.

## Admin handover

Deliver the production URL, support contact, role matrix, approved admin identity, MFA enrollment, user activation/archive procedures, patient portal provisioning instructions, backup owner, incident escalation and known limitations through approved secure channels. Transfer initial credentials via the organization's secret manager; never through this report or source control. Verify at least two authorized recovery owners without sharing accounts. Have the clinic owner sign off the synthetic patient journey and release checklist. No admin credentials were created or delivered during this review.
