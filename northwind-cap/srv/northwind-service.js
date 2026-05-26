'use strict';

const cds = require('@sap/cds');
const LOG  = cds.log('northwind-service');

/**
 * NorthwindService — CAP Node.js service handler.
 *
 * All reads are delegated to the Northwind OData v4 remote service:
 *   const nw = await cds.connect.to('Northwind')
 *   this.on('READ', 'Entity', req => nw.run(req.query))
 *
 * Computed elements (StockStatus, OrderStatus, LineTotal) are applied
 * after delegation — they are NOT sent to Northwind.
 *
 * Error handling per spec §6.3:
 *   503 — Northwind unreachable
 *   404 — entity key not found (handled automatically by CAP/OData layer)
 *   400 — invalid $filter expression (handled by OData layer)
 *
 * Spec ref: Northwind_CAP_FunctionalSpec.docx §6
 */
module.exports = cds.service.impl(async function () {

  // ── Connect to Northwind remote service ─────────────────────────────────
  // Configured in package.json → cds.requires.Northwind
  // URL: https://services.odata.org/V4/Northwind/Northwind.svc
  // Timeout: 5 seconds per spec §10.1
  const nw = await cds.connect.to('Northwind');

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPUTED ELEMENT HELPERS  (spec §6.2)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * StockStatus — Products computed field (spec §6.2)
   *   UnitsInStock = 0   → 'Out of Stock'
   *   UnitsInStock <= 10 → 'Low Stock'
   *   else               → 'In Stock'
   */
  function computeStockStatus(unitsInStock) {
    if (unitsInStock === null || unitsInStock === undefined) return null;
    if (unitsInStock === 0)  return 'Out of Stock';
    if (unitsInStock <= 10)  return 'Low Stock';
    return 'In Stock';
  }

  /**
   * OrderStatus — Orders computed field (spec §6.2)
   *   ShippedDate != null                             → 'Shipped'
   *   RequiredDate < today AND ShippedDate is null    → 'Overdue'
   *   else                                            → 'Open'
   */
  function computeOrderStatus(shippedDate, requiredDate) {
    if (shippedDate) return 'Shipped';
    if (requiredDate && new Date(requiredDate) < new Date()) return 'Overdue';
    return 'Open';
  }

  /**
   * LineTotal — Order_Details computed field (spec §6.2)
   *   LineTotal = UnitPrice × Quantity × (1 − Discount), rounded to 2 d.p.
   */
  function computeLineTotal(unitPrice, quantity, discount) {
    const p = parseFloat(unitPrice ?? 0);
    const q = parseInt(quantity    ?? 0, 10);
    const d = parseFloat(discount  ?? 0);
    return Math.round(p * q * (1 - d) * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  READ DELEGATION HANDLERS  (spec §6.1)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Products — delegate to Northwind, then compute StockStatus.
   * Spec §4.1: $filter, $select, $expand(Category,Supplier), $orderby, $top, $skip
   * Default page size: 50
   */
  this.on('READ', 'Products', async (req) => {
    try {
      _ensureColumns(req, ['UnitsInStock']); // required for StockStatus
      const result = await nw.run(req.query);
      _applyToEach(result, (p) => {
        p.StockStatus = computeStockStatus(p.UnitsInStock);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  /**
   * Categories — direct delegation.
   * Spec §4.2: $filter, $select, $expand(Products), $orderby
   */
  this.on('READ', 'Categories', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  /**
   * Customers — direct delegation (Address/PostalCode/Fax/Region excluded by CDS projection).
   * Spec §4.3: $filter(CompanyName,Country,City), $select, $orderby
   */
  this.on('READ', 'Customers', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  /**
   * Orders — delegate to Northwind, then compute OrderStatus.
   * Spec §4.4: $filter(CustomerID,OrderDate,ShipCountry), $expand(Customer,Order_Details)
   * Default page size: 50
   */
  this.on('READ', 'Orders', async (req) => {
    try {
      _ensureColumns(req, ['ShippedDate', 'RequiredDate']); // required for OrderStatus
      const result = await nw.run(req.query);
      _applyToEach(result, (o) => {
        o.OrderStatus = computeOrderStatus(o.ShippedDate, o.RequiredDate);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  /**
   * Order_Details — delegate to Northwind, then compute LineTotal.
   * Spec §4.5: $filter(OrderID,ProductID), $expand(Product)
   */
  this.on('READ', 'Order_Details', async (req) => {
    try {
      _ensureColumns(req, ['UnitPrice', 'Quantity', 'Discount']); // required for LineTotal
      const result = await nw.run(req.query);
      _applyToEach(result, (od) => {
        od.LineTotal = computeLineTotal(od.UnitPrice, od.Quantity, od.Discount);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  /**
   * Suppliers — direct delegation (Address fields excluded by CDS projection).
   * Spec §4.6: $filter(CompanyName,Country), $select, $orderby
   */
  this.on('READ', 'Suppliers', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE UTILITIES
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Ensure required columns are always included in the SELECT list.
   * Prevents client $select from omitting fields needed for computed elements.
   */
  function _ensureColumns(req, fields) {
    const cols = req.query?.SELECT?.columns;
    if (!cols || !Array.isArray(cols)) return; // no $select → all columns fetched
    for (const field of fields) {
      const exists = cols.some(
        (c) => (typeof c === 'string' && c === field) ||
               (c?.ref && c.ref[0] === field)
      );
      if (!exists) cols.push({ ref: [field] });
    }
  }

  /**
   * Apply a transformation function to every record in the result.
   * Handles both collection (array) and single-entity responses.
   */
  function _applyToEach(result, fn) {
    if (!result) return;
    const records = Array.isArray(result) ? result : [result];
    records.forEach((r) => { if (r && typeof r === 'object') fn(r); });
  }

  /**
   * Central remote error handler (spec §6.3).
   *   503 returned when Northwind is unreachable.
   *   Other errors are re-thrown for CAP/OData to handle (404, 400, etc.).
   */
  function _handleRemoteError(req, err) {
    LOG.error('Northwind remote error:', err.message ?? err);
    const isUnreachable =
      err.code === 'ECONNREFUSED' ||
      err.code === 'ENOTFOUND'    ||
      err.code === 'ETIMEDOUT'    ||
      err.statusCode === 503;
    if (isUnreachable) {
      req.error(503, 'Northwind remote service is currently unavailable. Please try again later.');
    } else {
      throw err;
    }
  }
});
