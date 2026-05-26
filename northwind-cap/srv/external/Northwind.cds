/**
 * External Northwind OData v4 service definition.
 * Normally generated via: cds import <url>
 * Source: https://services.odata.org/V4/Northwind/Northwind.svc/$metadata
 *
 * Only entities consumed by NorthwindService are defined here.
 * @cds.external tells CAP not to create local DB tables for these entities.
 */

@cds.external : true
service Northwind {

  entity Products {
    key ProductID       : Integer;
        ProductName     : String(40);
        SupplierID      : Integer;
        CategoryID      : Integer;
        QuantityPerUnit : String(20);
        UnitPrice       : Decimal(19, 4);
        UnitsInStock    : Integer;
        UnitsOnOrder    : Integer;
        ReorderLevel    : Integer;
        Discontinued    : Boolean;
        Category        : Association to Categories on Category.CategoryID = CategoryID;
        Supplier        : Association to Suppliers on Supplier.SupplierID = SupplierID;
        Order_Details   : Association to many Order_Details
                            on Order_Details.ProductID = ProductID;
  }

  entity Categories {
    key CategoryID   : Integer;
        CategoryName : String(15);
        Description  : String;
        Products     : Association to many Products
                         on Products.CategoryID = CategoryID;
  }

  entity Customers {
    key CustomerID   : String(5);
        CompanyName  : String(40);
        ContactName  : String(30);
        ContactTitle : String(30);
        Address      : String(60);
        City         : String(15);
        Region       : String(15);
        PostalCode   : String(10);
        Country      : String(15);
        Phone        : String(24);
        Fax          : String(24);
        Orders       : Association to many Orders
                         on Orders.CustomerID = CustomerID;
  }

  entity Orders {
    key OrderID        : Integer;
        CustomerID     : String(5);
        EmployeeID     : Integer;
        OrderDate      : Date;
        RequiredDate   : Date;
        ShippedDate    : Date;
        ShipVia        : Integer;
        Freight        : Decimal(19, 4);
        ShipName       : String(40);
        ShipAddress    : String(60);
        ShipCity       : String(15);
        ShipRegion     : String(15);
        ShipPostalCode : String(10);
        ShipCountry    : String(15);
        Customer       : Association to Customers
                           on Customer.CustomerID = CustomerID;
        Order_Details  : Association to many Order_Details
                           on Order_Details.OrderID = OrderID;
  }

  entity Order_Details {
    key OrderID   : Integer;
    key ProductID : Integer;
        UnitPrice : Decimal(19, 4);
        Quantity  : Integer;
        Discount  : Decimal(8, 4);
        Order     : Association to Orders
                      on Order.OrderID = OrderID;
        Product   : Association to Products
                      on Product.ProductID = ProductID;
  }

  entity Suppliers {
    key SupplierID   : Integer;
        CompanyName  : String(40);
        ContactName  : String(30);
        ContactTitle : String(30);
        Address      : String(60);
        City         : String(15);
        Region       : String(15);
        PostalCode   : String(10);
        Country      : String(15);
        Phone        : String(24);
        Fax          : String(24);
        HomePage     : String;
        Products     : Association to many Products
                         on Products.SupplierID = $self.SupplierID;
  }

}
