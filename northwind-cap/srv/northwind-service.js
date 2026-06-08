'use strict';

const cds = require('@sap/cds');
const LOG  = cds.log('northwind-service');

module.exports = cds.service.impl(async function () {
  const nw = await cds.connect.to('Northwind');

  function computeStockStatus(unitsInStock) {
    if (unitsInStock === null || unitsInStock === undefined) return null;
    if (unitsInStock === 0)  return 'Out of Stock';
    if (unitsInStock <= 10)  return 'Low Stock';
    return 'In Stock';
  }

  function computeOrderStatus(shippedDate, requiredDate) {
    if (shippedDate) return 'Shipped';
    if (requiredDate && new Date(requiredDate) < new Date()) return 'Overdue';
    return 'Open';
  }

  function computeLineTotal(unitPrice, quantity, discount) {
    const p = parseFloat(unitPrice ?? 0);
    const q = parseInt(quantity    ?? 0, 10);
    const d = parseFloat(discount  ?? 0);
    return Math.round(p * q * (1 - d) * 100) / 100;
  }

  this.on('READ', 'Products', async (req) => {
    try {
      _ensureColumns(req, ['UnitsInStock']);
      const result = await nw.run(req.query);
      _applyToEach(result, (p) => {
        p.StockStatus = computeStockStatus(p.UnitsInStock);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  this.on('READ', 'Categories', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  this.on('READ', 'Customers', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  this.on('READ', 'Orders', async (req) => {
    try {
      _ensureColumns(req, ['ShippedDate', 'RequiredDate']);
      const result = await nw.run(req.query);
      _applyToEach(result, (o) => {
        o.OrderStatus = computeOrderStatus(o.ShippedDate, o.RequiredDate);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  this.on('READ', 'Order_Details', async (req) => {
    try {
      _ensureColumns(req, ['UnitPrice', 'Quantity', 'Discount']);
      const result = await nw.run(req.query);
      _applyToEach(result, (od) => {
        od.LineTotal = computeLineTotal(od.UnitPrice, od.Quantity, od.Discount);
      });
      return result;
    } catch (err) { _handleRemoteError(req, err); }
  });

  this.on('READ', 'Suppliers', async (req) => {
    try {
      return await nw.run(req.query);
    } catch (err) { _handleRemoteError(req, err); }
  });

  function _ensureColumns(req, fields) {
    const cols = req.query?.SELECT?.columns;
    if (!cols || !Array.isArray(cols)) return;
    for (const field of fields) {
      const exists = cols.some(
        (c) => (typeof c === 'string' && c === field) ||
               (c?.ref && c.ref[0] === field)
      );
      if (!exists) cols.push({ ref: [field] });
    }
  }

  function _applyToEach(result, fn) {
    if (!result) return;
    const records = Array.isArray(result) ? result : [result];
    records.forEach((r) => { if (r && typeof r === 'object') fn(r); });
  }

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
