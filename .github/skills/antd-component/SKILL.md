---
name: antd-component
description: "Build production-ready Ant Design components for this Next.js App Router project. Handles forms, tables, modals, drawers, and data displays — all properly wired to tRPC mutations and queries."
context: fork
---

# Ant Design Component Skill

You will create a production-ready Ant Design component for this project.

## Pre-Build Checklist
1. Read the tRPC router for the relevant feature: `src/server/api/routers/[feature].ts`
2. Read existing antd components in `src/components/` for style reference
3. Identify input/output types from the tRPC procedure

## Rules (Non-Negotiable)
- File MUST start with `"use client"`
- NO dot notation: use `options` prop or direct path imports for subcomponents
- Message/notification/modal via `App.useApp()` — never static `message.success()`
- Forms: always `Form.useForm<TypedValues>()` with typed interface
- Tables: always typed `ColumnsType<DataType>` for columns
- Loading states: `loading={mutation.isPending}` on submit buttons

## Component Templates

### Form Component
```typescript
"use client";
import { Form, Input, Button, App } from "antd";
import { api } from "~/trpc/react";
import type { Create[Feature]Input } from "~/lib/validators/[feature]";

export function [Feature]Form({ onSuccess }: { onSuccess?: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Create[Feature]Input>();
  const utils = api.useUtils();

  const create = api.[feature].create.useMutation({
    onSuccess: () => {
      message.success("Created successfully");
      form.resetFields();
      void utils.[feature].getAll.invalidate();
      onSuccess?.();
    },
    onError: (err) => message.error(err.message),
  });

  return (
    <Form form={form} layout="vertical" onFinish={(v) => create.mutate(v)}>
      {/* fields */}
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={create.isPending}>Create</Button>
      </Form.Item>
    </Form>
  );
}
```

### Table Component
```typescript
"use client";
import { Table, Tag, Space, Button, App } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useState } from "react";
import { api } from "~/trpc/react";
import type { [Feature] } from "~/server/db/schema";

export function [Feature]Table() {
  const { modal, message } = App.useApp();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const utils = api.useUtils();

  const { data, isLoading } = api.[feature].getAll.useQuery({
    page: pagination.current,
    pageSize: pagination.pageSize,
  });

  const deleteMutation = api.[feature].delete.useMutation({
    onSuccess: () => {
      message.success("Deleted");
      void utils.[feature].getAll.invalidate();
    },
  });

  const handleDelete = (id: string) => {
    modal.confirm({
      title: "Are you sure?",
      content: "This action cannot be undone.",
      okType: "danger",
      onOk: () => deleteMutation.mutate({ id }),
    });
  };

  const columns: ColumnsType<[Feature]> = [
    { title: "Name", dataIndex: "name", sorter: true },
    // ... more columns
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="link" size="small">Edit</Button>
          <Button type="link" danger size="small" onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination({ current: pag.current ?? 1, pageSize: pag.pageSize ?? 20 });
  };

  return (
    <Table
      columns={columns}
      dataSource={data?.items}
      rowKey="id"
      loading={isLoading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: data?.total,
        showSizeChanger: true,
        showTotal: (total) => `${total} total`,
      }}
      onChange={handleTableChange}
    />
  );
}
```

## After Building
Verify the component renders without errors by checking imports and that no dot notation exists.
