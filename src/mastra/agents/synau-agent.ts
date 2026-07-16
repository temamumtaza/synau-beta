import { Agent } from '@mastra/core/agent';
import { getLLMConfig } from '../providers/llm';

export const synauAgent = new Agent({
  id: 'synauAgent',
  name: 'Synau Agent',
  instructions: `
    Kamu adalah AI assistant untuk Synau.in — platform pembelajaran berbasis AI.
    Bantu pengguna dengan pertanyaan dan tugas yang relevan dengan platform ini.
    Jawab secara ringkas, jelas, dan dalam bahasa Indonesia kecuali diminta sebaliknya.
  `,
  model: getLLMConfig(),
});
