import { readJson, removeKey, writeJson } from '@/storage/storage';

describe('storage', () => {
  it('round-trips a JSON value through write and read', async () => {
    const key = 'test:round-trip';
    await writeJson(key, { hello: 'world', n: 42 });
    const result = await readJson<{ hello: string; n: number }>(key);
    expect(result).toEqual({ hello: 'world', n: 42 });
  });

  it('returns null for a key that was never written', async () => {
    const result = await readJson('test:never-written');
    expect(result).toBeNull();
  });

  it('returns null after the key has been removed', async () => {
    const key = 'test:to-remove';
    await writeJson(key, { value: 1 });
    await removeKey(key);
    const result = await readJson(key);
    expect(result).toBeNull();
  });
});
