# Northwind CAP Service

SAP CAP Node.js facade over the public [Northwind OData v4](https://services.odata.org/V4/Northwind/Northwind.svc/) service.

## Project Structure

```
northwind-cap/
├── app/                        # UI5 / Fiori app (optional — Phase 2)
├── db/                         # empty — no local DB in v1
├── srv/
│   ├── external/
│   │   └── Northwind.cds       # External Northwind service definition
│   ├── northwind-service.cds   # CAP service definition + virtual computed fields
│   └── northwind-service.js    # READ handlers + computed field logic
├── xs-security.json            # XSUAA scopes and role templates
├── mta.yaml                    # BTP Cloud Foundry deployment descriptor
└── package.json                # cds.requires config + npm scripts
```

## Quick Start (Local Development)

```bash
npm install
cds watch
```

Server starts at: http://localhost:4004  
Auth in dev mode: **dummy** (no JWT required locally)

## Key npm Scripts

| Script | Purpose |
|---|---|
| `npm start` | Start CAP server on http://localhost:4004 |
| `cds watch` | Dev mode with hot reload |
| `cds import <url>` | Re-import Northwind $metadata → Northwind.csn |
| `mbt build` | Build MTA archive for BTP deployment |
| `cf deploy mta_archives/*.mtar` | Deploy to BTP Cloud Foundry |

## Exposed Entities

| Entity | Computed Field | Excluded Fields |
|---|---|---|
| Products | StockStatus | — |
| Categories | — | — |
| Customers | — | Address, PostalCode, Fax, Region |
| Orders | OrderStatus | — |
| Order_Details | LineTotal | — |
| Suppliers | — | Address, PostalCode, Fax, Region |

## Computed Field Logic

| Field | Logic |
|---|---|
| `StockStatus` | `UnitsInStock=0` → Out of Stock; `<=10` → Low Stock; else → In Stock |
| `OrderStatus` | `ShippedDate!=null` → Shipped; `RequiredDate<today&&!ShippedDate` → Overdue; else → Open |
| `LineTotal` | `UnitPrice × Quantity × (1 − Discount)`, rounded to 2 d.p. |

## API Endpoints

Base path: `/odata/v4/northwind/`  
All endpoints require `Authorization: Bearer <JWT>` except `$metadata`.

## BTP Deployment

```bash
mbt build
cf login -a <api-endpoint>
cf deploy mta_archives/northwind-cap_1.0.0.mtar
```

BTP services required: `xsuaa` (application), `destination` (lite), `html5-apps-repo` (app-host, optional)

> ⚠️ Northwind is a public demo service with no SLA. Not for production data.
