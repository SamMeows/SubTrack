import type { ServiceParser } from './types';
import { ClaudeApiParser } from './claude-api';
import { OpenAiApiParser } from './openai-api';
import { ElevenLabsApiParser } from './elevenlabs-api';
import { SunoSessionParser } from './suno-session';
import { MidjourneySessionParser } from './midjourney-session';
import { MeshySessionParser } from './meshy-session';

const ALL_PARSERS: ServiceParser[] = [
  new ClaudeApiParser(),
  new OpenAiApiParser(),
  new ElevenLabsApiParser(),
  new SunoSessionParser(),
  new MidjourneySessionParser(),
  new MeshySessionParser(),
];

export function getAllParsers(): ServiceParser[] {
  return ALL_PARSERS;
}

export function getParserByName(name: string): ServiceParser | undefined {
  return ALL_PARSERS.find((p) => p.name === name);
}
