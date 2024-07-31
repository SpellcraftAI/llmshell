import { test, expect } from "bun:test";
import { JSONPropertyStream, type JSONPropertyPair } from "./JSONPropertyStream";

async function streamTest(chunks: string[]): Promise<JSONPropertyPair[]> {
  const jsonStream = new JSONPropertyStream();
  const results: JSONPropertyPair[] = [];

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

test("JSONPropertyStream processes simple JSON chunks", async () => {
  const chunks = [
    '{ "path": "/a',
    '/b/c/d", "content": "this is',
    ' the rest of the stuff',
    ' follows after this ..." }'
  ];

  expect(JSON.parse(chunks.join(""))).toBeTruthy();

  const results = await streamTest(chunks);

  expect(results).toEqual([
    { key: "path", value: "/a" },
    { key: "path", value: "/b/c/d" },
    { key: "content", value: "this is" },
    { key: "content", value: " the rest of the stuff" },
    { key: "content", value: " follows after this ..." }
  ]);
});

test("JSONPropertyStream handles escaped quotes and special characters", async () => {
  const chunks = ['{ "key\\"with\\"quotes": "value\\nwith\\tspecial\\rchars" }'];

  const results = await streamTest(chunks);

  expect(results).toEqual([
    { key: 'key"with"quotes', value: 'value\nwith\tspecial\rchars' }
  ]);
});

test("JSONPropertyStream handles nested objects", async () => {
  const chunks = [
    '{ "nested": { "a": 1,',
    '"b": 2 }, "c": 3 }'
  ];

  const results = await streamTest(chunks);

  expect(results).toEqual([
    { key: "nested", value: "{" },
    { key: "nested", value: '"a": 1,' },
    { key: "nested", value: '"b": 2 }' },
    { key: "c", value: "3" }
  ]);
});