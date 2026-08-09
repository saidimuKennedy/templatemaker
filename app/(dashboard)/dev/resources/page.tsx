import {
  DevDocCode,
  DevDocPage,
  DevDocSection,
  DevDocTable,
} from "@/components/dev-docs/DevDocPage";

export default function ResourcesDataTabDocPage() {
  return (
    <DevDocPage
      title="Resources & the Data tab"
      description="How the editor Data tab defines backend collections, when data is stored, and how the published-site API works."
    >
      <DevDocSection title="What a resource is">
        <p>
          The editor <strong>Data</strong> tab (panel title: <strong>Resources</strong>) is where
          you define backend data collections for a published site — lightweight schemas that stored
          records must match.
        </p>
        <p>
          You design the table here; the live site writes rows to it after publish. A resource is a{" "}
          <strong>schema</strong>, not the data itself.
        </p>
        <p>
          Example: a resource named <DevDocCode>messages</DevDocCode> with a{" "}
          <DevDocCode>body</DevDocCode> string field defines what shape submissions must have. Valid
          submissions become <strong>records</strong> in the database only after the site is
          published.
        </p>
        <p>
          Definitions live on <DevDocCode>BuilderProject.resources</DevDocCode>. Saving in the
          editor runs an <DevDocCode>UpsertResource</DevDocCode> command (undo/redo applies).
        </p>
      </DevDocSection>

      <DevDocSection title="Form fields">
        <DevDocTable
          headers={["Setting", "Purpose"]}
          rows={[
            [
              "Name (slug)",
              "Internal ID and API segment. Lowercase, URL-safe (messages, contact_submissions). Becomes /api/records/{name}.",
            ],
            ["Label", "Human-friendly name shown in the editor (e.g. Messages)."],
            [
              "Fields",
              "Columns: name, type (string, text, number, boolean, email), optional required flag. At least one field per resource.",
            ],
            [
              "Honeypot field",
              "Anti-spam. Pick a field that must stay empty. Non-empty honeypot → silent reject (HTTP 204).",
            ],
            [
              "Public read access",
              "Off by default. When on, anyone can GET /api/records/{name} and list all records.",
            ],
          ]}
        />
      </DevDocSection>

      <DevDocSection title="Save vs publish">
        <DevDocTable
          headers={["Step", "What happens"]}
          rows={[
            [
              "Save resource",
              "Updates document.resources via command history. Reversible with undo.",
            ],
            [
              "Publish site",
              "Validates definitions, syncs Prisma Resource rows, exposes app-runtime API on the published site origin.",
            ],
          ]}
        />
        <p className="text-muted-foreground">
          AppRecord rows are created only when the live API receives valid writes after publish.
        </p>
      </DevDocSection>

      <DevDocSection title="App-runtime API">
        <p>
          Endpoints are served on the <strong>published site subdomain</strong> (site origin), not
          the dashboard app origin:
        </p>
        <DevDocTable
          headers={["Method", "Path", "Default access"]}
          rows={[
            ["GET", "/api/records/{name}", "Denied unless public read is enabled"],
            ["POST", "/api/records/{name}", "Public (anonymous create)"],
            ["GET", "/api/records/{name}/{id}", "Denied unless public read is enabled"],
            ["PATCH", "/api/records/{name}/{id}", "Denied"],
            ["DELETE", "/api/records/{name}/{id}", "Denied"],
          ]}
        />
        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>
            <strong className="text-foreground">No platform session</strong> — dashboard login
            cookies are ignored; visitors are anonymous.
          </li>
          <li>
            <strong className="text-foreground">Tenant scope from host</strong> — the proxy sets{" "}
            <DevDocCode>x-site-slug</DevDocCode> from the subdomain.
          </li>
          <li>
            <strong className="text-foreground">Server-side validation</strong> — Zod schema derived
            from the resource definition; invalid bodies return 400.
          </li>
          <li>
            <strong className="text-foreground">Permissions re-checked</strong> — UI toggles are
            configuration; every request is authorized again on the server.
          </li>
          <li>
            <strong className="text-foreground">Rate limiting</strong> — writes are throttled per
            portfolio.
          </li>
        </ul>
        <p className="text-muted-foreground">
          Default permissions: create public; read, update, and delete none.
        </p>
      </DevDocSection>

      <DevDocSection title="Example: contact messages">
        <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>
            Create <DevDocCode>messages</DevDocCode> with fields{" "}
            <DevDocCode>name</DevDocCode>, <DevDocCode>email</DevDocCode>,{" "}
            <DevDocCode>body</DevDocCode>.
          </li>
          <li>Optionally set a honeypot field for spam protection.</li>
          <li>Publish the site.</li>
          <li>
            POST JSON to <DevDocCode>/api/records/messages</DevDocCode> on the live site origin.
          </li>
          <li>Records are stored; listing requires public read access.</li>
        </ol>
      </DevDocSection>

      <DevDocSection title="Roadmap context">
        <p className="text-muted-foreground">
          Plan 31 (shipped): resource definitions and CRUD routes. Plan 32 (planned): declarative
          forms posting to the API. Plan 33 (planned): data bindings reading from the API. Today the
          Data tab is primarily schema design and API provisioning.
        </p>
      </DevDocSection>
    </DevDocPage>
  );
}
