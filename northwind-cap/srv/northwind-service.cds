using Northwind as nw from './external/Northwind';

@requires : 'northwind.view'
@path     : '/northwind'
service NorthwindService {

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

  @readonly
  entity Categories as projection on nw.Categories {
    key CategoryID,
        CategoryName,
        Description,
        Products : redirected to Products
  };

  @readonly
  entity Customers as projection on nw.Customers {
    key CustomerID,
        CompanyName,
        ContactName,
        Country,
        City,
        Phone
  };

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

  @readonly
  entity Order_Details as projection on nw.Order_Details {
    key OrderID,
    key ProductID,
        UnitPrice,
        Quantity,
        Discount,
        Product : redirected to Products
  };

  @readonly
  entity Suppliers as projection on nw.Suppliers {
    key SupplierID,
        CompanyName,
        ContactName,
        Country,
        Phone
  };
}

extend projection NorthwindService.Products with {
  virtual null as StockStatus : String(15)
};

extend projection NorthwindService.Orders with {
  virtual null as OrderStatus : String(10)
};

extend projection NorthwindService.Order_Details with {
  virtual null as LineTotal : Decimal(19, 2)
};
