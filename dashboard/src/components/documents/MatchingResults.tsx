import React from 'react';
import { MatchingResults as MatchingResultsType } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Scale, CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, ShieldAlert } from 'lucide-react';

interface MatchingResultsProps {
  matching?: MatchingResultsType;
}

export const MatchingResults: React.FC<MatchingResultsProps> = ({ matching }) => {
  if (!matching) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Scale size={32} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-300">Three-Way Matching Inactive</p>
        <p className="text-xs text-slate-400 mt-1">
          This document does not have associated PO or Goods Receipt matching data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-6">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Scale size={18} className="text-brand-400" />
            <span>Three-Way Matching Verification (Door 4)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">PO vs Vendor Invoice vs Warehouse Goods Receipt Note</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">Overall Score:</span>
          <span className="text-base font-mono font-bold text-slate-100">{matching.overallScore}%</span>
          <StatusBadge status={matching.status} size="sm" />
        </div>
      </div>

      {/* Fraud & Anomaly Alert Banner (if any) */}
      {matching.fraudFlags.length > 0 && (
        <div className="mx-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider mb-2 text-rose-400">
            <ShieldAlert size={16} />
            <span>Fraud Risk Flags Triggered</span>
          </div>
          <ul className="space-y-1 text-xs">
            {matching.fraudFlags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3 Pillars of Matching */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
        {/* Pillar 1: Purchase Order Match */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold uppercase text-slate-400">1. PO Verification</span>
              {matching.poMatch.matched ? (
                <span className="text-emerald-400 flex items-center gap-1 text-xs font-mono">
                  <CheckCircle2 size={13} /> MATCH
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 text-xs font-mono">
                  <AlertTriangle size={13} /> VARIANCE
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>PO Reference:</span>
                <span className="text-slate-200 font-bold">{matching.poMatch.poNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>PO Authorized:</span>
                <span className="text-slate-200">${matching.poMatch.expectedTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Invoice Billed:</span>
                <span className="text-slate-200">${matching.poMatch.actualTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                <span>Total Variance:</span>
                <span className={matching.poMatch.variancePercentage > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {matching.poMatch.variancePercentage}%
                </span>
              </div>
            </div>
          </div>
          {matching.poMatch.discrepancies.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-amber-300">
              {matching.poMatch.discrepancies.map((d, i) => (
                <p key={i}>⚠️ {d}</p>
              ))}
            </div>
          )}
        </div>

        {/* Pillar 2: Goods Receipt (GRN) Match */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold uppercase text-slate-400">2. Goods Receipt (GRN)</span>
              {matching.goodsReceiptMatch.matched ? (
                <span className="text-emerald-400 flex items-center gap-1 text-xs font-mono">
                  <CheckCircle2 size={13} /> CONFIRMED
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 text-xs font-mono">
                  <AlertTriangle size={13} /> PENDING
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>GRN Slip:</span>
                <span className="text-slate-200 font-bold">{matching.goodsReceiptMatch.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivered Score:</span>
                <span className="text-emerald-400">{matching.goodsReceiptMatch.deliveredQuantityScore}%</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pending Deliveries:</span>
                <span className="text-slate-200">{matching.goodsReceiptMatch.pendingDeliveries}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            {matching.goodsReceiptMatch.notes}
          </div>
        </div>

        {/* Pillar 3: Vendor Master & Banking */}
        <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-semibold uppercase text-slate-400">3. Vendor Bank Master</span>
              {matching.vendorVerification.bankDetailsMatch ? (
                <span className="text-emerald-400 flex items-center gap-1 text-xs font-mono">
                  <CheckCircle2 size={13} /> VERIFIED
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 text-xs font-mono">
                  <AlertOctagon size={13} /> DIVERGENCE
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Vendor Status:</span>
                <span className="text-slate-200">{matching.vendorVerification.vendorRating}</span>
              </div>
              <div className="flex flex-col text-[11px] mt-1 text-slate-400">
                <span>Registered Master IBAN:</span>
                <span className="text-emerald-400 truncate">{matching.vendorVerification.registeredIban}</span>
              </div>
              <div className="flex flex-col text-[11px] mt-1 text-slate-400">
                <span>Invoiced IBAN:</span>
                <span className={matching.vendorVerification.bankDetailsMatch ? 'text-slate-200 truncate' : 'text-rose-400 truncate font-bold'}>
                  {matching.vendorVerification.invoiceIban}
                </span>
              </div>
            </div>
          </div>
          {!matching.vendorVerification.bankDetailsMatch && (
            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-rose-400 font-semibold flex items-center gap-1">
              <ArrowRight size={12} /> High Risk: Wire divergence detected!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
