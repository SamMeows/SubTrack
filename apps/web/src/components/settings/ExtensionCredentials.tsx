'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ExtensionCredentialsProps {
  supabaseUrl: string;
  anonKey: string;
}

/** 값을 마스킹 (앞 10자 + •••• + 뒤 10자) */
function maskValue(value: string): string {
  if (value.length <= 24) return '••••••••••••';
  return value.slice(0, 10) + '••••••••••••' + value.slice(-10);
}

/** 개별 자격증명 행 */
function CredentialRow({
  label,
  value,
  masked = false,
  fieldName,
  copiedField,
  onCopy,
  onToggleVisibility,
  visible = true,
}: {
  label: string;
  value: string;
  masked?: boolean;
  fieldName: string;
  copiedField: string | null;
  onCopy: (value: string, fieldName: string) => void;
  onToggleVisibility?: () => void;
  visible?: boolean;
}) {
  const displayValue = !visible && masked ? maskValue(value) : value;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs text-gray-800 select-all">
          {value ? displayValue : '로딩 중...'}
        </div>
        {masked && onToggleVisibility && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="shrink-0"
          >
            {visible ? '숨기기' : '보기'}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onCopy(value, fieldName)}
          disabled={!value}
          className="shrink-0"
        >
          {copiedField === fieldName ? '복사됨!' : '복사'}
        </Button>
      </div>
    </div>
  );
}

export function ExtensionCredentials({
  supabaseUrl,
  anonKey,
}: ExtensionCredentialsProps) {
  const [accessToken, setAccessToken] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    async function fetchToken() {
      const supabase = createClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setTokenError('세션을 가져올 수 없습니다. 다시 로그인해주세요.');
        return;
      }
      setAccessToken(session.access_token);
    }
    fetchToken();
  }, []);

  const copyToClipboard = useCallback(
    async (value: string, fieldName: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        // clipboard API 사용 불가 시 무시
      }
    },
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-gray-900">
          Chrome Extension 연동
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-500">
          아래 값들을 Chrome Extension 설정 화면에 붙여넣으세요.
        </p>

        <CredentialRow
          label="Supabase URL"
          value={supabaseUrl}
          fieldName="url"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        <CredentialRow
          label="Anon Key"
          value={anonKey}
          fieldName="anonKey"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {tokenError ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              Access Token (JWT)
            </label>
            <p className="text-sm text-red-500">{tokenError}</p>
          </div>
        ) : (
          <CredentialRow
            label="Access Token (JWT)"
            value={accessToken}
            masked
            visible={tokenVisible}
            onToggleVisibility={() => setTokenVisible((v) => !v)}
            fieldName="token"
            copiedField={copiedField}
            onCopy={copyToClipboard}
          />
        )}

        <p className="text-xs text-gray-400">
          Access Token은 로그인 세션에 따라 변경됩니다. 만료 시 이 페이지에서
          다시 복사하세요.
        </p>
      </CardContent>
    </Card>
  );
}
