"use client";

import { Table, type TableProps } from "antd";

export function EntityTable<T>({ rowKey = "id", ...props }: TableProps<T>) {
  return <Table<T> rowKey={rowKey} {...props} />;
}
