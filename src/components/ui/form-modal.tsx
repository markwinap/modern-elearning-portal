"use client";

import type { ReactNode } from "react";
import { Form, Modal } from "antd";
import type { FormInstance, ModalProps } from "antd";

interface Props<T extends object> extends Omit<
  ModalProps,
  "onOk" | "children"
> {
  form: FormInstance<T>;
  children: ReactNode;
  onFinish?: (values: T) => void;
  initialValues?: Partial<T>;
}

export function FormModal<T extends object>({
  form,
  children,
  onFinish,
  initialValues,
  ...modalProps
}: Props<T>) {
  return (
    <Modal {...modalProps} onOk={() => form.submit()}>
      <Form<T>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        {children}
      </Form>
    </Modal>
  );
}
