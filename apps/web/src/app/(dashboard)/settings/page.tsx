import { ExtensionCredentials } from '@/components/settings/ExtensionCredentials';

export default function SettingsPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">설정</h1>
      <div className="max-w-2xl">
        <ExtensionCredentials supabaseUrl={supabaseUrl} anonKey={anonKey} />
      </div>
    </div>
  );
}
