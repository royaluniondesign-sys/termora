import { describe, it, expect } from 'vitest';
import {
  encodeInputAsHex,
  buildSendKeysCommands,
  ControlModeLineBuffer,
  type ControlModeEvent,
} from '../control-mode-parser.js';

describe('encodeInputAsHex', () => {
  it('encodes ASCII characters correctly', () => {
    expect(encodeInputAsHex('A')).toBe('41');
    expect(encodeInputAsHex('AB')).toBe('41 42');
    expect(encodeInputAsHex('ls\n')).toBe('6c 73 0a');
  });

  it('returns empty string for empty input', () => {
    expect(encodeInputAsHex('')).toBe('');
  });
});

describe('buildSendKeysCommands', () => {
  it('returns an array of tmux send-keys commands', () => {
    const commands = buildSendKeysCommands('my-session', 'hello');
    expect(commands).toHaveLength(1);
    expect(commands[0]).toBe(
      'send-keys -t my-session -H 68 65 6c 6c 6f',
    );
  });

  it('chunks long input into multiple commands', () => {
    // MAX_HEX_CHUNK is 512 chars, so 513 chars should produce 2 commands
    const longInput = 'x'.repeat(513);
    const commands = buildSendKeysCommands('sess', longInput);
    expect(commands.length).toBe(2);
    // Each command should start with the send-keys prefix
    for (const cmd of commands) {
      expect(cmd).toMatch(/^send-keys -t sess -H /);
    }
  });
});

describe('ControlModeLineBuffer', () => {
  it('parses %output lines and emits output events', () => {
    const events: ControlModeEvent[] = [];
    const buffer = new ControlModeLineBuffer((e) => events.push(e));

    // Feed a complete %output line (octal \150\145\154\154\157 = "hello")
    buffer.feed('%output %0 \\150\\145\\154\\154\\157\n');

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'output',
      paneId: '%0',
      data: 'hello',
    });
  });

  it('buffers partial lines until newline arrives', () => {
    const events: ControlModeEvent[] = [];
    const buffer = new ControlModeLineBuffer((e) => events.push(e));

    buffer.feed('%output %0 ');
    expect(events).toHaveLength(0);

    buffer.feed('data\n');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: 'output',
      paneId: '%0',
      data: 'data',
    });
  });

  it('parses %begin, %end, %error, and %exit events', () => {
    const events: ControlModeEvent[] = [];
    const buffer = new ControlModeLineBuffer((e) => events.push(e));

    buffer.feed('%begin 1234 1 0\n%end 1235 1 0\n%error 1236 2 0\n%exit\n');

    expect(events).toHaveLength(4);
    expect(events[0]).toEqual({ type: 'begin', timestamp: 1234, cmdNumber: 1 });
    expect(events[1]).toEqual({ type: 'end', timestamp: 1235, cmdNumber: 1 });
    expect(events[2]).toEqual({ type: 'error', timestamp: 1236, cmdNumber: 2 });
    expect(events[3]).toEqual({ type: 'exit' });
  });

  it('ignores non-event lines', () => {
    const events: ControlModeEvent[] = [];
    const buffer = new ControlModeLineBuffer((e) => events.push(e));

    buffer.feed('some random text\n%session-changed $1 main\n\n');
    expect(events).toHaveLength(0);
  });
});
