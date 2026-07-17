import type { MessageInstance } from "antd/es/message/interface";

export interface ToastMutationOptions {
  messageApi: MessageInstance;
  successMessage: string;
  invalidate?: () => Promise<unknown> | Promise<unknown>[] | void;
  onSuccess?: () => void;
}

export function toastMutationOptions({
  messageApi,
  successMessage,
  invalidate,
  onSuccess,
}: ToastMutationOptions) {
  return {
    onSuccess: () => {
      void messageApi.success(successMessage);
      if (invalidate) {
        const inv = invalidate();
        if (Array.isArray(inv)) {
          void Promise.all(inv);
        } else if (inv) {
          void inv;
        }
      }
      onSuccess?.();
    },
    onError: (error: { message: string }) => {
      void messageApi.error(error.message);
    },
  };
}
