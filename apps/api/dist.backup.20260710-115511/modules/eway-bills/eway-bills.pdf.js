"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEwayBillHtml = generateEwayBillHtml;
function generateEwayBillHtml(bill) {
    const items = bill.items || [];
    const itemsHtml = items
        .map((item, idx) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.hsnCode}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.quantity}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.unit}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${parseFloat(item.taxableAmount).toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.gstRate}%</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${parseFloat(item.cgst || 0).toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${parseFloat(item.sgst || 0).toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${parseFloat(item.igst || 0).toFixed(2)}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">₹${parseFloat(item.total).toFixed(2)}</td>
    </tr>
  `)
        .join('');
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>E-Way Bill ${bill.ewayBillNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .title { font-size: 24px; font-weight: bold; }
        .status { font-size: 14px; color: ${bill.status === 'GENERATED' ? 'green' : 'orange'}; margin-top: 5px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
        .two-column { display: flex; gap: 40px; }
        .column { flex: 1; }
        .row { margin-bottom: 8px; display: flex; justify-content: space-between; }
        .label { font-weight: bold; width: 40%; }
        .value { width: 60%; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #333; color: white; padding: 10px; text-align: left; font-size: 12px; }
        td { padding: 8px; }
        .totals { margin-top: 20px; text-align: right; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">E-Way Bill</div>
        <div class="status">Status: ${bill.status}</div>
        <div>Bill Number: ${bill.ewayBillNumber}</div>
      </div>

      <div class="section">
        <div class="section-title">BILL DETAILS</div>
        <div class="two-column">
          <div class="column">
            <div class="row">
              <span class="label">Document Number:</span>
              <span class="value">${bill.documentNumber}</span>
            </div>
            <div class="row">
              <span class="label">Document Date:</span>
              <span class="value">${new Date(bill.documentDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="row">
              <span class="label">Supply Type:</span>
              <span class="value">${bill.supplyType}</span>
            </div>
            <div class="row">
              <span class="label">Document Type:</span>
              <span class="value">${bill.documentType}</span>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <span class="label">Valid Upto:</span>
              <span class="value">${bill.validUpto ? new Date(bill.validUpto).toLocaleDateString('en-IN') : 'Draft'}</span>
            </div>
            <div class="row">
              <span class="label">Generated:</span>
              <span class="value">${bill.generatedAt ? new Date(bill.generatedAt).toLocaleDateString('en-IN') : 'Not Generated'}</span>
            </div>
            <div class="row">
              <span class="label">Distance:</span>
              <span class="value">${bill.distanceKm || '-'} km</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">DISPATCH FROM</div>
        <div class="two-column">
          <div class="column">
            <div class="row">
              <span class="label">Name:</span>
              <span class="value">${bill.fromName}</span>
            </div>
            <div class="row">
              <span class="label">GSTIN:</span>
              <span class="value">${bill.fromGstin || '-'}</span>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <span class="label">Pincode:</span>
              <span class="value">${bill.fromPincode || '-'}</span>
            </div>
            <div class="row">
              <span class="label">State Code:</span>
              <span class="value">${bill.fromStateCode || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">SHIP TO</div>
        <div class="two-column">
          <div class="column">
            <div class="row">
              <span class="label">Name:</span>
              <span class="value">${bill.toName}</span>
            </div>
            <div class="row">
              <span class="label">GSTIN:</span>
              <span class="value">${bill.toGstin || '-'}</span>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <span class="label">Pincode:</span>
              <span class="value">${bill.toPincode || '-'}</span>
            </div>
            <div class="row">
              <span class="label">State Code:</span>
              <span class="value">${bill.toStateCode || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">TRANSPORT DETAILS</div>
        <div class="two-column">
          <div class="column">
            <div class="row">
              <span class="label">Vehicle Number:</span>
              <span class="value">${bill.vehicleNumber || '-'}</span>
            </div>
            <div class="row">
              <span class="label">Vehicle Type:</span>
              <span class="value">${bill.vehicleType || 'REGULAR'}</span>
            </div>
          </div>
          <div class="column">
            <div class="row">
              <span class="label">Transport Mode:</span>
              <span class="value">${bill.transportMode || 'ROAD'}</span>
            </div>
            <div class="row">
              <span class="label">Transporter:</span>
              <span class="value">${bill.transporterName || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">GOODS DETAILS</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Taxable</th>
              <th>GST%</th>
              <th>CGST</th>
              <th>SGST</th>
              <th>IGST</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div>Taxable Value: ₹${parseFloat(bill.taxableValue).toFixed(2)}</div>
        <div>CGST: ₹${parseFloat(bill.cgstValue).toFixed(2)}</div>
        <div>SGST: ₹${parseFloat(bill.sgstValue).toFixed(2)}</div>
        <div>IGST: ₹${parseFloat(bill.igstValue).toFixed(2)}</div>
        <div>Cess: ₹${parseFloat(bill.cessValue).toFixed(2)}</div>
        <div style="font-size: 16px; margin-top: 10px; border-top: 2px solid #000; padding-top: 10px;">
          Grand Total: ₹${parseFloat(bill.totalValue).toFixed(2)}
        </div>
      </div>

      <div class="footer">
        <p>This E-Way Bill is valid for movement of goods as per GST rules.</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
      </div>
    </body>
    </html>
  `;
}
//# sourceMappingURL=eway-bills.pdf.js.map