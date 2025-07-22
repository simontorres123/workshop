import * as React from 'react';
import { DataGrid, GridColDef, GridRowId } from '@mui/x-data-grid';

interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  getRowId?: (row: T) => GridRowId;
}

export default function DataTable<T>({ rows, columns, getRowId }: DataTableProps<T>) {
  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        initialState={{
            pagination: {
                paginationModel: { page: 0, pageSize: 5}
            }
        }}
        pageSizeOptions={[5, 10]}
        checkboxSelection
      />
    </div>
  );
}
