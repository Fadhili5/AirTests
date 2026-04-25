import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

export const SimpleTable = <T,>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) => (
  <div className="panel overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left font-medium text-slate-500">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, index) => (
            <tr key={index} className="bg-white">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-800">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
