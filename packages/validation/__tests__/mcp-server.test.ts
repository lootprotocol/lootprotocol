import { describe, it, expect } from 'vitest';
import { validateExtension } from '../src/index.js';
import { createZip } from './helpers.js';

describe('MCP Server Validation', () => {
  it('passes for a valid stdio MCP server', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'my-mcp',
        transport: 'stdio',
        command: 'node',
        args: ['dist/index.js'],
      }),
      'package.json': JSON.stringify({ name: 'my-mcp', version: '1.0.0' }),
      'src/index.ts': 'console.log("hello");',
      'README.md': '# My MCP Server\n\nUseful server.',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(true);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata!.name).toBe('my-mcp');
  });

  it('passes for a valid http MCP server', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'my-http-mcp',
        transport: 'http',
        url: 'https://example.com/mcp',
      }),
      'package.json': JSON.stringify({
        name: 'my-http-mcp',
        version: '2.0.0',
      }),
      'src/server.ts': 'export default {};',
      'README.md': '# HTTP MCP\n\nHTTP transport MCP server.',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(true);
    expect(result.metadata!.transport).toBe('http');
  });

  it('passes for a valid sse MCP server', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'sse-mcp',
        transport: 'sse',
        url: 'https://example.com/sse',
      }),
      'requirements.txt': 'flask>=2.0',
      'src/main.py': 'print("hello")',
      'README.md': '# SSE MCP\n\nSSE transport.',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(true);
  });

  it('fails when mcp.json is missing', async () => {
    const zip = createZip({
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_FILE', path: 'mcp.json' }),
    );
  });

  it('fails when mcp.json has invalid JSON', async () => {
    const zip = createZip({
      'mcp.json': '{ invalid json',
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_JSON' }),
    );
  });

  it('fails when transport is invalid', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'websocket',
      }),
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_SCHEMA' }),
    );
  });

  it('fails when stdio transport is missing command', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'stdio',
      }),
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_SCHEMA',
        message: expect.stringContaining('command'),
      }),
    );
  });

  it('fails when both package.json and requirements.txt are missing', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'stdio',
        command: 'node',
      }),
      'src/index.ts': 'export {};',
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_FILE',
        message: expect.stringContaining('package.json or requirements.txt'),
      }),
    );
  });

  it('fails when src/ directory is missing', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'stdio',
        command: 'node',
      }),
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'README.md': '# Test',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_DIR' }),
    );
  });

  it('fails when README.md is missing', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'stdio',
        command: 'node',
      }),
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_FILE', path: 'README.md' }),
    );
  });

  it('fails when README.md is empty', async () => {
    const zip = createZip({
      'mcp.json': JSON.stringify({
        name: 'test',
        transport: 'stdio',
        command: 'node',
      }),
      'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
      'src/index.ts': 'export {};',
      'README.md': '   ',
    });

    const result = await validateExtension('mcp_server', zip, 'mcp.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'EMPTY_FILE' }),
    );
  });
});
