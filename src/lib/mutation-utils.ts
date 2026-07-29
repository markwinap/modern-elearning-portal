import type { MessageInstance } from "antd/es/message/interface";

export interface ToastMutationOptions<TData = unknown, TVariables = unknown> {
  messageApi: MessageInstance;
  successMessage: string;
  invalidate?: () => Promise<unknown> | Promise<unknown>[] | void;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export function toastMutationOptions<TData = unknown, TVariables = unknown>({
  messageApi,
  successMessage,
  invalidate,
  onSuccess,
}: ToastMutationOptions<TData, TVariables>) {
  return {
    onSuccess: (data: TData, variables: TVariables) => {
      void messageApi.success(successMessage);
      if (invalidate) {
        const inv = invalidate();
        if (Array.isArray(inv)) {
          void Promise.all(inv);
        } else if (inv) {
          void inv;
        }
      }
      onSuccess?.(data, variables);
    },
    onError: (error: { message: string }) => {
      void messageApi.error(error.message);
    },
  };
}
