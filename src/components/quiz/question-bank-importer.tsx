"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Button, Input, Modal, Select, Space } from "antd";

import { useTRPC } from "~/trpc/react";

export function QuestionBankImporter() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "gift" | "qti-lite">("csv");
  const [content, setContent] = useState("");
  const mutation = useMutation(trpc.questionBank.import.mutationOptions({ onSuccess: async ({ imported }) => { await queryClient.invalidateQueries({ queryKey: trpc.questionBank.list.queryKey() }); message.success(`Imported ${imported} questions`); setOpen(false); setContent(""); }, onError: (error) => message.error(error.message) }));
  return <><Button onClick={() => setOpen(true)}>Import</Button><Modal title="Import question bank" open={open} onCancel={() => setOpen(false)} onOk={() => mutation.mutate({ format, content })} confirmLoading={mutation.isPending}><Space orientation="vertical" style={{ width: "100%" }}><Select value={format} onChange={setFormat} options={[{ value: "csv", label: "CSV" }, { value: "gift", label: "GIFT" }, { value: "qti-lite", label: "QTI-lite CSV" }]} /><Input.TextArea rows={10} value={content} onChange={(event) => setContent(event.target.value)} placeholder={format === "gift" ? "Question{=Answer}" : "prompt,answer,difficulty,tags"} /></Space></Modal></>;
}
