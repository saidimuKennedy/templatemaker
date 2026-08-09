# Resources & the Data tab

The editor **Data** tab (panel title: **Resources**) is where you define **backend data collections** for a published site — lightweight schemas that stored records conform to.

You design the table here; the live site writes rows to it after publish.

## What a resource is

A resource is a **schema**, not the data itself.

Example: a resource named `messages` with a `body` string field defines what shape submissions must have. Once the site is published, valid submissions are stored as **records** in the database.

Resources live on the project document at `BuilderProject.resources`. Saving in the editor issues an `UpsertResource` command (undo/redo applies). Nothing is written to the application database until **publish**.

## Form fields

| Setting | Purpose |
| --- | --- |
| **Name (slug)** | Internal ID and API path segment. Lowercase, URL-safe (`messages`, `contact_submissions`). Becomes `/api/records/{name}`. Pattern: `^[a-z][a-z0-9_-]{0,63}$`. |
| **Label** | Human-friendly name shown in the editor (e.g. `Messages`). |
| **Fields** | Columns: name, type (`string`, `text`, `number`, `boolean`, `email`), optional **required** flag. At least one field is required per resource. |
| **Honeypot field** | Anti-spam. Pick a field that should stay empty on real submissions. If the honeypot key is present and non-empty, the server silently rejects the write (HTTP 204). |
| **Public read access** | When off (default), listing records is denied. When on, anyone can `GET /api/records/{name}` and receive all records for that resource. |

## Save vs publish

| Step | What happens |
| --- | --- |
| **Save resource** (editor) | Updates `document.resources` via the command history. Reversible with undo. |
| **Publish site** | Validates resource definitions, syncs schemas to Prisma `Resource` rows, and exposes the app-runtime API on the **published site origin**. |

Records (`AppRecord` rows) are created only when the live API receives valid writes after publish.

## App-runtime API

Each resource exposes HTTP endpoints on the **published site subdomain** (site origin), not the dashboard app origin:

| Method | Path | Default access |
| --- | --- | --- |
| `GET` | `/api/records/{name}` | Denied unless public read is enabled |
| `POST` | `/api/records/{name}` | Public (anonymous create) |
| `GET` | `/api/records/{name}/{id}` | Denied unless public read is enabled |
| `PATCH` | `/api/records/{name}/{id}` | Denied |
| `DELETE` | `/api/records/{name}/{id}` | Denied |

### Request handling

- **No platform session** — app-runtime routes ignore dashboard login cookies. Visitors are anonymous.
- **Tenant scope from host** — the proxy sets `x-site-slug` from the subdomain; callers cannot spoof another site's slug via the path.
- **Server-side validation** — payloads are parsed with a Zod schema derived from the resource definition. Invalid bodies return `400`.
- **Permissions re-checked server-side** — UI toggles are configuration only; every request is authorized again on the server (ADR-012).
- **Rate limiting** — writes are throttled per portfolio.
- **Honeypot** — bots that fill every input field are dropped without an error surface.

Default permissions (`DEFAULT_RESOURCE_PERMISSIONS`):

```ts
create: "public"
read: "none"
update: "none"
delete: "none"
```

## Example: contact messages

1. Create resource `messages` with fields `name` (string), `email` (email), `body` (text).
2. Optionally set honeypot to a hidden field name used in the form markup.
3. Publish the site.
4. Submit `{ "name": "Ada", "email": "ada@example.com", "body": "Hello" }` to `POST /api/records/messages` on the live site origin.
5. Records are stored; they are not listable unless **Public read access** is enabled.

## Product roadmap context

| Plan | Status | Role |
| --- | --- | --- |
| [Plan 31](../plans/31-resources-and-api.md) | Shipped | Resource definitions, Prisma sync, CRUD routes |
| Plan 32 | Planned | Declarative forms → `POST /api/records/...` |
| Plan 33 | Planned | Data bindings → `GET /api/records/...` |

Today the Data tab is primarily **schema design + API provisioning**. Form and binding UI that call these endpoints are the next layers.

## Related code

| Area | Location |
| --- | --- |
| Resource types | `builder/resources/types.ts` |
| Validation | `builder/resources/validate.ts`, `builder/resources/zod-schema.ts` |
| Editor panel | `components/editor/ResourcesPanelEditor.tsx` |
| Publish sync | `lib/app-runtime/records.ts` → `syncResourcesForPortfolio` |
| Collection routes | `lib/app-runtime/collection-handlers.ts` |
| Single-record routes | `lib/app-runtime/record-handlers.ts` |

## See also

- [Plan 28 — Application layer overview](../plans/28-application-layer-overview.md)
- [Plan 31 — Resources & API](../plans/31-resources-and-api.md)
- [ADR-012 — Bindings and actions](../decisions/ADR-012-application-layer-bindings-and-actions.md)
