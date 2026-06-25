import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiLlmService } from './openai-llm.service';

describe('OpenAiLlmService', () => {
  /** Tworzy serwis z podanym trybem E2E. */
  function createService(e2e: boolean): OpenAiLlmService {
    const config = {
      get: (key: string) => (key === 'E2E' ? (e2e ? 'true' : 'false') : 'test-key'),
    } as unknown as ConfigService;
    return new OpenAiLlmService(config);
  }

  describe('tryb E2E', () => {
    it('formatDocument zwraca deterministyczny HTML', async () => {
      const service = createService(true);
      const html = await service.formatDocument({ content: 'Tytuł\n\nAkapit', title: 'Tytuł' });
      expect(html).toContain('<h1>');
      expect(html).toContain('<p>');
    });

    it('formatDocument zachowuje tabele z HTML wejściowego (.docx)', async () => {
      const service = createService(true);
      const html = await service.formatDocument({
        content: '<h1>Raport</h1><table><tr><td>A</td><td>B</td></tr></table>',
        title: 'Raport',
        isHtml: true,
      });
      expect(html).toContain('<table>');
      expect(html).toContain('<td>A</td>');
    });

    it('editDocument pogrubia nagłówki na polecenie', async () => {
      const service = createService(true);
      const html = await service.editDocument({
        currentHtml: '<h1>A</h1>',
        instruction: 'pogrub nagłówki',
      });
      expect(html).toContain('<strong>');
    });
  });

  describe('retry/backoff', () => {
    it('ponawia przy 503 i zwraca wynik', async () => {
      jest.useFakeTimers();
      const service = createService(false);
      const create = jest
        .fn()
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValueOnce({ choices: [{ message: { content: '<h1>OK</h1>' } }] });
      (service as any).client = { chat: { completions: { create } } };

      const promise = service.formatDocument({ content: 'x' });
      await jest.runAllTimersAsync();
      const html = await promise;

      expect(create).toHaveBeenCalledTimes(2);
      expect(html).toContain('<h1>');
      jest.useRealTimers();
    });

    it('rzuca ServiceUnavailable przy błędzie quota', async () => {
      const service = createService(false);
      const create = jest.fn().mockRejectedValue({ code: 'insufficient_quota', status: 429 });
      (service as any).client = { chat: { completions: { create } } };

      await expect(service.formatDocument({ content: 'x' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('czyszczenie odpowiedzi modelu', () => {
    it('usuwa ogrodzenia markdown ```html z odpowiedzi', async () => {
      const service = createService(false);
      const create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: '```html\n<h1>Tytuł</h1><p>Treść</p>\n```' } }],
      });
      (service as any).client = { chat: { completions: { create } } };

      const html = await service.formatDocument({ content: 'x' });

      expect(html).not.toContain('```');
      expect(html).not.toContain('html\n');
      expect(html).toContain('<h1>Tytuł</h1>');
    });
  });
});
