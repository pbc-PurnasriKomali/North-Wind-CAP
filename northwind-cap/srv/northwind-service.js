'use strict';
const cds = require('@sap/cds');
const LOG = cds.log('northwind');

module.exports = cds.service.impl(async function () {
  const nw = await cds.connect.to('Northwind');

  this.on('READ', 'Products', async req => {
    try {
      const cols = req.query?.SELECT?.columns;
      if (cols?.length) ensureCols(cols, ['UnitsInStock']);
      const data = await nw.run(req.query);
      for (const p of Array.isArray(data) ? data : [data]) {
        if (!p) continue;
        p.StockStatus = p.UnitsInStock === 0 ? 'Out of Stock'
          : p.UnitsInStock <= 10 ? 'Low Stock' : 'In Stock';
      }
      return data;
    } catch (e) { handleErr(req, e); }
  });

  this.on('READ', 'Categories', async req => {
    try { return await nw.run(req.query); }
    catch (e) { handleErr(req, e); }
  });

  this.on('READ', 'Customers', async req => {
    try { return await nw.run(req.query); }
    catch (e) { handleErr(req, e); }
  });

  this.on('READ', 'Orders', async req => {
    try {
      const cols = req.query?.SELECT?.columns;
      if (cols?.length) ensureCols(cols, ['ShippedDate', 'RequiredDate']);
      const data = await nw.run(req.query);
      const now = new Date();
      for (const o of Array.isArray(data) ? data : [data]) {
        if (!o) continue;
        if (o.ShippedDate) o.OrderStatus = 'Shipped';
        else if (o.RequiredDate && new Date(o.RequiredDate) < now) o.OrderStatus = 'Overdue';
        else o.OrderStatus = 'Open';
      }
      return data;
    } catch (e) { handleErr(req, e); }
  });

  this.on('READ', 'Order_Details', async req => {
    try {
      const cols = req.query?.SELECT?.columns;
      if (cols?.length) ensureCols(cols, ['UnitPrice', 'Quantity', 'Discount']);
      const data = await nw.run(req.query);
      for (const d of Array.isArray(data) ? data : [data]) {
        if (!d) continue;
        d.LineTotal = +(d.UnitPrice * d.Quantity * (1 - d.Discount)).toFixed(2);
      }
      return data;
    } catch (e) { handleErr(req, e); }
  });

  this.on('READ', 'Suppliers', async req => {
    try { return await nw.run(req.query); }
    catch (e) { handleErr(req, e); }
  });

  function ensureCols(cols, fields) {
    for (const f of fields) {
      if (!cols.some(c => c === f || c?.ref?.[0] === f)) cols.push({ ref: [f] });
    }
  }

  function handleErr(req, err) {
    LOG.error('Remote error:', err.message ?? err);
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(err.code) || err.statusCode === 503) {
      req.error(503, 'Northwind service unavailable');
    } else throw err;
  }
});
