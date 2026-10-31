import { ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (newPage: number) => void;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  page = 1,
  totalPages = 1,
  totalItems,
  onPageChange,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
}: DataTableProps<T>) {
  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 font-medium text-xs uppercase tracking-wider">
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={`px-5 py-3.5 select-none ${col.sortable ? 'cursor-pointer hover:text-slate-200 transition-colors' : ''}`}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-500">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp size={14} className="text-brand-400" />
                            ) : (
                              <ChevronDown size={14} className="text-brand-400" />
                            )
                          ) : (
                            <ChevronsUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <LoadingSpinner text="Loading records..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const rowKey = item.id || `row-${index}`;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer hover:bg-slate-800/50' : ''
                    }`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-5 py-3.5 text-slate-300 align-middle">
                        {col.render ? col.render(item) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-800 bg-slate-900/40 text-xs text-slate-400">
          <div>
            {totalItems !== undefined && (
              <span>
                Showing <span className="font-medium text-slate-200">{data.length}</span> of{' '}
                <span className="font-medium text-slate-200">{totalItems}</span> results
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-2">
              Page <span className="font-medium text-slate-200">{page}</span> of{' '}
              <span className="font-medium text-slate-200">{totalPages}</span>
            </span>
            <button
              onClick={() => onPageChange && onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange && onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
