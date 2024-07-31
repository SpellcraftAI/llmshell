import { test, describe, expect } from "bun:test";
import { StreamingJSON } from './StreamingJSON';

async function streamTest(chunks: string[]): Promise<string[]> {
  const jsonStream = new StreamingJSON();
  const results: string[] = [];

  const readable = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });

  const writer = new WritableStream({
    write(chunk) {
      results.push(chunk);
    }
  });

  await readable.pipeThrough(jsonStream).pipeTo(writer);

  return results;
}

describe('StreamingJSON', () => {
  test('processes a simple complete JSON object', async () => {
    const chunks = ['{"key": "value"}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"key": "value"}']);
  });

  test('processes a simple JSON object in multiple chunks', async () => {
    const chunks = ['{', '"key":', ' "val', 'ue"}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"key": "value"}']);
  });

  test('handles nested objects', async () => {
    const chunks = ['{"outer": {"inner": "value"}}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"outer": {"inner": "value"}}']);
  });

  test('handles nested objects in multiple chunks', async () => {
    const chunks = ['{', '"outer": {', '"inner": "val', 'ue"}}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"outer": {"inner": "value"}}']);
  });

  test('handles arrays', async () => {
    const chunks = ['{"array": [1, 2, 3]}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"array": [1, 2, 3]}']);
  });

  test('handles arrays in multiple chunks', async () => {
    const chunks = ['{', '"array": [1', ', 2, ', '3]}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"array": [1, 2, 3]}']);
  });

  test('handles escaped quotes in strings', async () => {
    const chunks = ['{"key": "value \\"with quotes\\""}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"key": "value \\"with quotes\\""}']);
  });

  test('handles escaped quotes in strings across chunks', async () => {
    const chunks = ['{"key": "value \\"with ', 'quotes\\""}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"key": "value \\"with quotes\\""}']);
  });

  test('handles multiple top-level objects', async () => {
    const chunks = ['{"first": 1}', '{"second": 2}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"first": 1}', '{"second": 2}']);
  });

  test('handles incomplete objects', async () => {
    const chunks = ['{"key": "value"', ', "another": "value2"}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"key": "value", "another": "value2"}']);
  });

  test('handles incomplete arrays', async () => {
    const chunks = ['{"array": [1, 2', ', 3, 4]}'];
    const results = await streamTest(chunks);
    expect(results).toEqual(['{"array": [1, 2, 3, 4]}']);
  });

  test('handles complex nested structures', async () => {
    const chunks = [
      '{"level1": {"level2": [{"level3": "value"',
      '}, {"level3": [1, 2, 3]}]}, "sibling": "value"}'
    ];
    const results = await streamTest(chunks);
    expect(results).toEqual([
      '{"level1": {"level2": [{"level3": "value"}, {"level3": [1, 2, 3]}]}, "sibling": "value"}'
    ]);
  });

  test('produces only valid JSON chunks', async () => {
    const chunks = [
      '{"key1": "value1", "key2": ',
      '{"nested": "object"}, "key3": [1, 2,',
      ' 3], "key4": "string with \\"quotes\\""}',
    ];

    const results = await streamTest(chunks);
    for (const result of results) {
      expect(() => JSON.parse(result)).not.toThrow();
    }
  });
});