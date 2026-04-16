import { createClient, SupabaseClient } from "@supabase/supabase-js";

type SupabaseStorageConfig = {
  url: string;
  serviceKey: string;
  bucket: string;
};

function getSupabaseStorageConfig(): SupabaseStorageConfig | null {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? process.env.SUPABASE_SECRET_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? "qr-assets";

  if (!url || !serviceKey || !bucket) return null;
  return { url, serviceKey, bucket };
}

export function isSupabaseStorageEnabled(): boolean {
  return getSupabaseStorageConfig() !== null;
}

function getSupabaseClient(): { client: SupabaseClient; bucket: string } {
  const config = getSupabaseStorageConfig();
  if (!config) {
    throw new Error("SUPABASE_STORAGE_NOT_CONFIGURED");
  }

  const globalForSupabase = globalThis as unknown as {
    __supabaseStorageClient?: SupabaseClient;
  };

  if (!globalForSupabase.__supabaseStorageClient) {
    globalForSupabase.__supabaseStorageClient = createClient(config.url, config.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    client: globalForSupabase.__supabaseStorageClient,
    bucket: config.bucket,
  };
}

export async function uploadToSupabaseStorage(options: {
  objectPath: string;
  content: Buffer;
  contentType: string;
}): Promise<string> {
  const { client, bucket } = getSupabaseClient();

  const { error } = await client.storage.from(bucket).upload(options.objectPath, options.content, {
    upsert: true,
    contentType: options.contentType,
  });

  if (error) {
    throw new Error(`SUPABASE_UPLOAD_FAILED:${error.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(options.objectPath);
  if (!data.publicUrl) {
    throw new Error("SUPABASE_PUBLIC_URL_FAILED");
  }

  return data.publicUrl;
}
