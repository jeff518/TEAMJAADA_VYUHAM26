import React, { useState } from 'react';
import { ExtractedData } from '../../types';
import { FileText, Building2, Calendar, CreditCard, Layers, Eye, EyeOff } from 'lucide-react';

interface ExtractionDisplayProps {
  data?: ExtractedData;
}

export const ExtractionDisplay: React.FC<ExtractionDisplayProps> = ({ data }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <FileText size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-300">No extracted data available</p>
        <p className="text-xs text-slate-400 mt-1">
          This document may still be undergoing Door 1/2 inspection or extraction was blocked.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-6">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <FileText size={18} className="text-brand-400" />
            <span>Extracted Financial Metadata</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Parsed via Gemini Multimodal Vision & Neural OCR</p>
        </div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
        >
          {showRaw ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{showRaw ? 'Hide Raw OCR' : 'View Raw OCR'}</span>
        </button>
      </div>

      {showRaw && (
        <div className="mx-6 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto">
          {data.rawTextPreview || JSON.stringify(data, null, 2)}
        </div>
      )}

      {/* Grid of Key Properties */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {/* Vendor Box */}
        <div className="p-4 rounded-xl bg-slate-850/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            <Building2 size={14} className="text-brand-400" />
            <span>Vendor Details</span>
          </div>
          <h4 className="text-sm font-bold text-slate-100">{data.vendorName}</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{data.vendorAddress}</p>
          <div className="mt-3 pt-2 border-t border-slate-800 font-mono text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Tax ID:</span>
              <span className="text-slate-200">{data.vendorTaxId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SWIFT / BIC:</span>
              <span className="text-slate-200">{data.vendorSwift}</span>
            </div>
          </div>
        </div>

        {/* Invoice & PO Details */}
        <div className="p-4 rounded-xl bg-slate-850/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            <Calendar size={14} className="text-brand-400" />
            <span>Document Identifiers</span>
          </div>
          <div className="font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice Number:</span>
              <span className="font-bold text-slate-100">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Purchase Order:</span>
              <span className="font-bold text-brand-400">{data.poNumber || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Issue Date:</span>
              <span className="text-slate-200">{data.invoiceDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Due Date:</span>
              <span className="text-slate-200">{data.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-4 rounded-xl bg-slate-850/60 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            <CreditCard size={14} className="text-brand-400" />
            <span>Payment Summary</span>
          </div>
          <div className="font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span className="text-slate-200">${data.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tax / VAT:</span>
              <span className="text-slate-200">${data.taxAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold">
              <span className="text-slate-100">Total ({data.currency}):</span>
              <span className="text-emerald-400">${data.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Terms: {data.paymentTerms}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="px-6 pb-6">
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Layers size={14} className="text-brand-400" />
          <span>Extracted Line Items ({data.lineItems?.length || 0})</span>
        </h4>

        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">PO Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {data.lineItems?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-850/40">
                  <td className="px-4 py-3 text-slate-400">{item.itemNumber}</td>
                  <td className="px-4 py-3 text-slate-200 font-sans font-medium">{item.description}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-300">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-100">${item.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {item.matchedPoItem ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        MATCHED
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        UNMATCHED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
