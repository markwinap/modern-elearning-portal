"use client";

import { useState } from "react";
import { Upload, Button, Image, Space, App } from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

type UploadRequestOption = NonNullable<Parameters<NonNullable<UploadProps["customRequest"]>>[0]>;
import { upload } from "@vercel/blob/client";

interface CoverImageUploadProps {
  value?: string;
  onChange?: (url: string | undefined) => void;
}

export function CoverImageUpload({ value, onChange }: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { message } = App.useApp();

  const handleUpload = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setUploading(true);
    try {
      const blob = await upload(`cover-images/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/cover-image",
      });
      onChange?.(blob.url);
      void message.success("Image uploaded successfully");
    } catch (err) {
      void message.error((err as Error).message ?? "Upload failed");
      options.onError?.(err as Error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange?.(undefined);
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {value ? (
        <>
          <Image
            src={value}
            alt="Course cover"
            width={320}
            height={180}
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
          <Button
            icon={<DeleteOutlined />}
            danger
            size="small"
            onClick={handleRemove}
          >
            Remove image
          </Button>
        </>
      ) : null}
      <Upload
        accept="image/jpeg,image/png,image/webp,image/gif"
        showUploadList={false}
        customRequest={handleUpload}
      >
        <Button icon={<UploadOutlined />} loading={uploading}>
          {value ? "Replace image" : "Upload cover image"}
        </Button>
      </Upload>
    </Space>
  );
}
