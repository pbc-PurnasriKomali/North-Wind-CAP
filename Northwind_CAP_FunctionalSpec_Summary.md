# Northwind CAP Functional Specification — Summary

> **Source**: `Northwind_CAP_FunctionalSpec.docx`  
> **Version**: 1.0 (Initial Draft)

---

## 1. Purpose & Scope

Build a **SAP CAP (Node.js)** service that:
- Connects to the public **Northwind OData v4** service as a remote source
- Acts as a **facade** — re-exposes a curated subset of entities
- Applies business logic (computed fields, filtering, projections)
- Secures endpoints via **SAP BTP XSUAA JWT** authentication
- Deploys to **SAP BTP Cloud Foundry**

### 1.1 Objectives
- Consume Northwind via CAP remote service delegation (`cds.connect.to()`)
- Expose only required entities (not all 26 Northwind entity sets)
- Apply field-level projections, computed properties, and basic validation
- Secure with XSUAA for production; deploy to BTP CF

### 1.2 Out of Scope (v1)
- Write-back / mutations (Northwind is read-only)
- Custom persistence (no HANA or SQLite tables)
- Real-time / streaming data

---

## 2. Architecture

**Three-layer architecture (left → right per spec):**

```
SAP UI5 / Fiori App          CAP Node.js Service          Northwind OData
OData v4 Client        →     BTP Cloud Foundry       →    services.odata.org
```

**Source service URL:** `https://services.odata.org/V4/Northwind/Northwind.svc/`  
**Service base path:** `/odata/v4/northwind/`

### 2.1 Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20 LTS | CAP requires Node 18+ |
| Framework | SAP CAP (cds) 8.x | `@sap/cds` npm package |
| Remote Service | Northwind OData v4 | services.odata.org — public, no auth |
| Auth | SAP XSUAA (BTP) | JWT bearer, xs-security.json |
| Deployment | SAP BTP Cloud Foundry | mta.yaml, cf push |
| OData Version | OData v4 | CAP default protocol |
| Package Manager | npm | package.json lock file |

---

## 3. Northwind Remote Service

**Base URL:** `https://services.odata.org/V4/Northwind/Northwind.svc/`  
Northwind is publicly accessible, requires no authentication, and supports OData v4.

### 3.1 CAP External Service Declaration (`package.json`)

Declare the remote service in `package.json` under `cds.requires`:

```json
"cds": {
  "requires": {
    "Northwind": {
      "kind": "odata-v4",
      "model": "srv/external/Northwind",
      "credentials": {
        "url": "https://services.odata.org/V4/Northwind/Northwind.svc"
      }
    }
  }
}
```

### 3.2 Full Northwind Entity Catalogue (Available)

Northwind exposes 26 entity sets. Only the highlighted ones are consumed in this project:

| Entity Set | Key Field(s) | Description |
|---|---|---|
| **Products** | ProductID | Product catalogue with pricing and stock |
| **Categories** | CategoryID | Product category groupings |
| **Customers** | CustomerID | Customer master data |
| **Orders** | OrderID | Sales order headers |
| **Order_Details** | OrderID, ProductID | Sales order line items |
| **Suppliers** | SupplierID | Product suppliers |
| Employees | EmployeeID | Employee master **(optional / phase 2)** |
| Territories | TerritoryID | Sales territories — not exposed |
| Shippers | ShipperID | Shipper master — not exposed |
| Region | RegionID | Region master — not exposed |
| CustomerDemographics | CustomerTypeID | Not exposed |
| EmployeeTerritories | EmployeeID + TerritoryID | Not exposed |
| Alphabetical_list_of_products | (view) | Not exposed |
| Current_Product_List | (view) | Not exposed |
| ... (other views) | — | Not exposed — 12 additional view entities |

> **Legend:** **Bold** = Exposed in CAP service \| Employees = Optional / phase 2

---

## 4. CAP Exposed Entities & API Design

### 4.1 Products

| Field | Type | Notes |
|---|---|---|
| ProductID | Integer (Key) | Read-only key |
| ProductName | String(40) | Exposed as-is |
| CategoryID | Integer | FK to Categories |
| SupplierID | Integer | FK to Suppliers |
| UnitPrice | Decimal | Exposed as-is |
| UnitsInStock | Integer | Exposed as-is |
| Discontinued | Boolean | Exposed as-is |
| **StockStatus** | String (computed) | Low / OK / Out based on UnitsInStock |

- Supports: `$filter`, `$select`, `$expand` (Category, Supplier), `$orderby`, `$top`, `$skip`
- Default page size: 50

### 3.2 Categories

| Field | Type | Notes |
|---|---|---|
| CategoryID | Integer (Key) | Read-only key |
| CategoryName | String(15) | Exposed as-is |
| Description | String | Exposed as-is |

- Supports: `$filter`, `$select`, `$expand` (Products), `$orderby`

### 3.3 Customers

| Field | Type | Notes |
|---|---|---|
| CustomerID | String(5) (Key) | Read-only key |
| CompanyName | String(40) | Exposed as-is |
| ContactName | String(30) | Exposed as-is |
| Country | String(15) | Exposed as-is |
| City | String(15) | Exposed as-is |
| Phone | String(24) | Exposed as-is |

> ⚠️ Address, PostalCode, Fax, Region **intentionally excluded**

- Supports: `$filter` (CompanyName, Country, City), `$select`, `$orderby`

### 3.4 Orders

| Field | Type | Notes |
|---|---|---|
| OrderID | Integer (Key) | Read-only key |
| CustomerID | String(5) | FK to Customers |
| EmployeeID | Integer | FK to Employees |
| OrderDate | Date | ISO 8601 |
| RequiredDate | Date | Exposed as-is |
| ShippedDate | Date | Null if not shipped |
| ShipCountry | String(15) | Exposed as-is |
| Freight | Decimal | Exposed as-is |
| **OrderStatus** | String (computed) | Open / Shipped / Overdue |

- Supports: `$filter` (CustomerID, OrderDate range, ShipCountry), `$expand` (Customer, Order_Details), `$orderby`, `$top`, `$skip`
- Default page size: 50

### 3.5 Order_Details

| Field | Type | Notes |
|---|---|---|
| OrderID | Integer (Key) | Composite key part 1 |
| ProductID | Integer (Key) | Composite key part 2 |
| UnitPrice | Decimal | Price at time of order |
| Quantity | Integer | Exposed as-is |
| Discount | Decimal | 0.0–1.0 range |
| **LineTotal** | Decimal (computed) | UnitPrice × Quantity × (1 − Discount) |

- Supports: `$filter` (OrderID, ProductID), `$expand` (Product)

### 3.6 Suppliers

| Field | Type | Notes |
|---|---|---|
| SupplierID | Integer (Key) | Read-only key |
| CompanyName | String(40) | Exposed as-is |
| ContactName | String(30) | Exposed as-is |
| Country | String(15) | Exposed as-is |
| Phone | String(24) | Exposed as-is |

> ⚠️ Address fields excluded (same as Customers)

- Supports: `$filter` (CompanyName, Country), `$select`, `$orderby`

---

## 4. Computed Elements

| Entity | Computed Field | Logic |
|---|---|---|
| Products | StockStatus | `UnitsInStock = 0` → `'Out of Stock'`; `<= 10` → `'Low Stock'`; else → `'In Stock'` |
| Orders | OrderStatus | `ShippedDate != null` → `'Shipped'`; `RequiredDate < today && ShippedDate null` → `'Overdue'`; else → `'Open'` |
| Order_Details | LineTotal | `UnitPrice × Quantity × (1 − Discount)`, rounded to 2 d.p. |

---

## 5. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/odata/v4/northwind/Products` | JWT | List products |
| GET | `/odata/v4/northwind/Products(1)` | JWT | Single product |
| GET | `/odata/v4/northwind/Products?$expand=Category` | JWT | Product + Category |
| GET | `/odata/v4/northwind/Categories` | JWT | List categories |
| GET | `/odata/v4/northwind/Categories(1)/Products` | JWT | Products in category |
| GET | `/odata/v4/northwind/Customers` | JWT | List customers |
| GET | `/odata/v4/northwind/Customers('ALFKI')` | JWT | Single customer |
| GET | `/odata/v4/northwind/Orders` | JWT | List orders |
| GET | `/odata/v4/northwind/Orders(10248)` | JWT | Single order |
| GET | `/odata/v4/northwind/Orders?$expand=Order_Details` | JWT | Order + line items |
| GET | `/odata/v4/northwind/Order_Details` | JWT | All order lines |
| GET | `/odata/v4/northwind/Suppliers` | JWT | List suppliers |
| GET | `/odata/v4/northwind/$metadata` | **None** | OData metadata |

### OData Query Parameters

| Parameter | Support |
|---|---|
| `$filter` | Full support |
| `$select` | Full support |
| `$expand` | Supported on defined navigations |
| `$orderby` | Full support |
| `$top` / `$skip` | Pagination supported |
| `$count` | Returns inline record count |
| `$search` | ❌ Not supported in v1 |

---

## 6. Service Handler Pattern

```js
const nw = await cds.connect.to('Northwind');
this.on('READ', 'Products',      req => nw.run(req.query));
this.on('READ', 'Categories',    req => nw.run(req.query));
this.on('READ', 'Customers',     req => nw.run(req.query));
this.on('READ', 'Orders',        req => nw.run(req.query));
this.on('READ', 'Order_Details', req => nw.run(req.query));
this.on('READ', 'Suppliers',     req => nw.run(req.query));
```

### Error Handling

| HTTP Code | Trigger |
|---|---|
| 503 | Northwind unreachable |
| 404 | Entity key not found |
| 400 | Invalid `$filter` expression |

---

## 7. Authentication & Authorisation

**Strategy:** SAP BTP XSUAA — JWT Bearer Token.  
All endpoints **except** `$metadata` require a valid JWT.

| Role | Scope | Permitted Actions |
|---|---|---|
| NorthwindViewer | `northwind.view` | Read all exposed entities |
| NorthwindAdmin | `northwind.admin` | Read + `$metadata` + diagnostics |

**XSUAA Scopes:**

| Scope Name | Description |
|---|---|
| `$XSAPPNAME.northwind.view` | Grants read access to all entity sets |
| `$XSAPPNAME.northwind.admin` | Full read access including metadata and diagnostics |

**CDS Annotation:**
```cds
@requires: 'northwind.view'
service NorthwindService {
  @readonly entity Products as projection on nw.Products;
  // ... other entities
}
```

---

## 8. Project Structure

```
northwind-cap/
├── app/                        # UI5 / Fiori app (optional)
├── db/                         # (empty — no local DB in v1)
├── srv/
│   ├── external/
│   │   └── Northwind.csn       # Imported Northwind metadata
│   ├── northwind-service.cds   # Service definition
│   └── northwind-service.js    # Handlers + computed fields
├── xs-security.json            # XSUAA scopes and roles
├── mta.yaml                    # BTP deployment descriptor
└── package.json                # cds.requires config
```

### Key npm Scripts

| Script | Purpose |
|---|---|
| `npm start` | Start CAP server locally on `http://localhost:4004` |
| `cds watch` | Dev mode with hot reload |
| `cds import <url>` | Import Northwind `$metadata` → `Northwind.csn` |
| `mbt build` | Build MTA archive for BTP deployment |
| `cf deploy mta_archives/*.mtar` | Deploy to BTP CF |

---

## 9. BTP Deployment

### Modules

| Module | Type | Description |
|---|---|---|
| `northwind-srv` | nodejs | CAP service — main deployable |
| `northwind-app-deployer` | com.sap.application.content | Deploys UI5 static content (if applicable) |

### BTP Services Required

| Service | Plan | Purpose |
|---|---|---|
| xsuaa | application | JWT auth — bound to northwind-srv |
| destination | lite | Optional — if Northwind URL via Destination service |
| html5-apps-repo | app-host | Only if UI5 app deployed alongside |

### Environment Variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `CDS_FEATURES_ASSERT_INTEGRITY` | `false` |
| `NORTHWIND_URL` | `https://services.odata.org/V4/Northwind/Northwind.svc` |

---

## 10. Constraints & Assumptions

### Technical Constraints
- Northwind is **read-only** — no POST, PATCH, DELETE
- No `$search` support — use `$filter` only
- 5-second timeout recommended for Northwind calls
- CAP remote delegation adds **one network hop** per request
- Caching deferred to **Phase 2**

### Assumptions
- Consumers pass a valid **XSUAA JWT** in `Authorization` header
- Northwind remains publicly accessible at the documented URL
- BTP CF environment needs at least **512 MB memory**

> ⚠️ **Warning:** Northwind is a public demo service with **no SLA** and possible rate limits.  
> Suitable for development/prototyping only — **not for production data**.

---

## Revision History

| Version | Author | Changes |
|---|---|---|
| 1.0 | — | Initial draft |
