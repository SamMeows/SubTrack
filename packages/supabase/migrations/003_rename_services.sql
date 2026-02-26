-- 서비스명 변경: Claude API → Anthropic API, OpenAI → OpenAI API
UPDATE public.subscriptions SET service_name = 'Anthropic API' WHERE service_name = 'Claude API';
UPDATE public.subscriptions SET service_name = 'OpenAI API' WHERE service_name = 'OpenAI';
