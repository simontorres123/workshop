import * as React from 'react';
import { DataGrid, GridColDef, GridRowId } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';

const spanishLocaleText = {
  ...esES.components.MuiDataGrid.defaultProps.localeText,
  paginationDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
    `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
};

interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  getRowId?: (row: T) => GridRowId;
  initialState?: any;
  pageSizeOptions?: number[];
  getRowHeight?: any;
  sx?: any;
  checkboxSelection?: boolean;
  autoHeight?: boolean;
}

export default function DataTable<T>({
  rows,
  columns,
  getRowId,
  initialState,
  pageSizeOptions = [5, 10],
  getRowHeight,
  sx,
  checkboxSelection = true,
  autoHeight = false,
}: DataTableProps<T>) {
  return (
    <div style={{ height: autoHeight ? 'auto' : 400, width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        initialState={initialState || {
          pagination: { paginationModel: { page: 0, pageSize: 5 } }
        }}
        pageSizeOptions={pageSizeOptions}
        getRowHeight={getRowHeight}
        sx={sx}
        checkboxSelection={checkboxSelection}
        autoHeight={autoHeight}
        localeText={spanishLocaleText}
      />
    </div>
  );
}
