using Northwind as nw from './external/Northwind';

/**
 * NorthwindService — CAP OData v4 facade over the Northwind remote service.
 *
 * Base path : /odata/v4/northwind/
 * Auth      : SAP BTP XSUAA — northwind.view scope required for all reads
 * Pattern   : Remote service delegation via cds.connect.to('Northwind')
 *
 * Spec ref  : Northwind_CAP_FunctionalSpec.docx §4
 */

@requires : 'northwind.view'
@path     : '/northwind'
service NorthwindService {

  // ── §4.1 Products ───────────────────────────────────────────────────────
  // StockStatus is a computed virtual element (see extend below + handler)
  // Supports: $filter, $select, $expand(Category,Supplier), $orderby, $top, $skip
  // Default server-side page size: 50
  @readonly
  entity Products as projection on nw.Products {
    key ProductID,
        ProductName,
        CategoryID,
        SupplierID,
        UnitPrice,
        UnitsInStock,
        Discontinued,
        Category      : redirected to Categories,
        Supplier      : redirected to Suppliers,
        Order_Details : redirected to Order_Details
  };

  // ── §4.2 Categories ─────────────────────────────────────────────────────
  // Supports: $filter, $select, $expand(Products), $orderby
  @readonly
  entity Categories as projection on nw.Categories {
    key CategoryID,
        CategoryName,
        Description,
        Products : redirected to Products
  };

  // ── §4.3 Customers ──────────────────────────────────────────────────────
  // Address, PostalCode, Fax, Region intentionally excluded per spec §4.3
  // Supports: $filter(CompanyName,Country,City), $select, $orderby
  @readonly
  entity Customers as projection on nw.Customers {
    key CustomerID,
        CompanyName,
        ContactName,
        Country,
        City,
        Phone
  };

  // ── §4.4 Orders ─────────────────────────────────────────────────────────
  // OrderStatus is a computed virtual element (see extend below + handler)
  // Supports: $filter(CustomerID,OrderDate,ShipCountry), $expand(Customer,Order_Details)
  // Default server-side page size: 50
  @readonly
  entity Orders as projection on nw.Orders {
    key OrderID,
        CustomerID,
        EmployeeID,
        OrderDate,
        RequiredDate,
        ShippedDate,
        ShipCountry,
        Freight,
        Customer      : redirected to Customers,
        Order_Details : redirected to Order_Details
  };

  // ── §4.5 Order_Details ──────────────────────────────────────────────────
  // LineTotal is a computed virtual element (see extend below + handler)
  // Composite key: OrderID + ProductID
  // Supports: $filter(OrderID,ProductID), $expand(Product)
  @readonly
  entity Order_Details as projection on nw.Order_Details {
    key OrderID,
    key ProductID,
        UnitPrice,
        Quantity,
        Discount,
        Product : redirected to Products
  };

  // ── §4.6 Suppliers ──────────────────────────────────────────────────────
  // Address fields excluded (same as Customers) per spec §4.6
  // Supports: $filter(CompanyName,Country), $select, $orderby
  @readonly
  entity Suppliers as projection on nw.Suppliers {
    key SupplierID,
        CompanyName,
        ContactName,
        Country,
        Phone
  };

}

// ─────────────────────────────────────────────────────────────────────────────
// Virtual / computed elements — spec §6.2 Computed Elements
// Not delegated to Northwind; populated by northwind-service.js handler.
// CAP 8.x syntax for extend projection: 'virtual null as ‹name› : Type'
// ─────────────────────────────────────────────────────────────────────────────

// StockStatus: UnitsInStock=0 → 'Out of Stock'; <=10 → 'Low Stock'; else → 'In Stock'
extend projection NorthwindService.Products with {
  virtual null as StockStatus : String(15)
};

// OrderStatus: ShippedDate!=null → 'Shipped'; RequiredDate<today&&!ShippedDate → 'Overdue'; else → 'Open'
extend projection NorthwindService.Orders with {
  virtual null as OrderStatus : String(10)
};

// LineTotal: UnitPrice × Quantity × (1 − Discount), rounded to 2 d.p.
extend projection NorthwindService.Order_Details with {
  virtual null as LineTotal : Decimal(19, 2)
};
