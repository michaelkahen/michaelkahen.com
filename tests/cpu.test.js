"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AssemblyError,
  BranchPredictor,
  DataCache,
  PipelineCPU,
  SAMPLE_PROGRAMS,
  assemble,
  decode,
  runReference,
} = require("../assets/js/cpu.js");

function runPipeline(source, options) {
  const cpu = new PipelineCPU(Object.assign({ cacheEnabled: true, predictor: "adaptive" }, options));
  const program = cpu.load(source);
  const snapshot = cpu.run(20000);
  assert.notEqual(snapshot.state, "fault", snapshot.fault && snapshot.fault.message);
  return { cpu, program, snapshot };
}

function memoryWord(memory, address) {
  return (
    memory[address] |
    (memory[address + 1] << 8) |
    (memory[address + 2] << 16) |
    (memory[address + 3] << 24)
  ) | 0;
}

test("assembler emits canonical RV32I encodings", function () {
  const result = assemble([
    "add x3, x1, x2",
    "addi x5, x0, -1",
    "lw x6, 12(x7)",
    "sw x6, 16(x7)",
    "beq x1, x2, target",
    "jal x1, target",
    "target: ebreak",
  ].join("\n"));

  assert.deepEqual(result.words.map(function (word) { return word >>> 0; }), [
    0x002081b3,
    0xfff00293,
    0x00c3a303,
    0x0063a823,
    0x00208463,
    0x004000ef,
    0x00100073,
  ]);
});

test("assembler expands pseudo-instructions and preserves source mapping", function () {
  const result = assemble([
    "li t0, 0x12345678",
    "mv a0, t0",
    "j done",
    "nop",
    "done: halt",
  ].join("\n"));

  assert.equal(result.instructions.length, 6);
  assert.equal(decode(result.words[0]).name, "lui");
  assert.equal(decode(result.words[1]).name, "addi");
  assert.equal(result.instructions[0].lineNumber, 1);
  assert.equal(result.instructions[1].lineNumber, 1);
  assert.equal(decode(result.words[5]).halt, true);
});

test("assembler reports useful line-level diagnostics", function () {
  assert.throws(
    function () { assemble("addi x1, x0, 5000\nwat x2, x3"); },
    function (error) {
      assert.ok(error instanceof AssemblyError);
      assert.equal(error.diagnostics[0].line, 1);
      assert.match(error.diagnostics[0].message, /Immediate/);
      return true;
    },
  );
  assert.throws(function () { assemble("again: nop\nagain: halt"); }, /Duplicate label/);
});

test("ALU, shifts, comparisons, upper immediates, and x0 are correct", function () {
  const source = [
    "li x1, -8",
    "li x2, 3",
    "add x3, x1, x2",
    "sub x4, x2, x1",
    "and x5, x1, x2",
    "or x6, x1, x2",
    "xor x7, x1, x2",
    "sll x8, x2, x2",
    "srl x9, x1, x2",
    "sra x10, x1, x2",
    "slt x11, x1, x2",
    "sltu x12, x1, x2",
    "lui x13, 0x12345",
    "auipc x14, 1",
    "addi x0, x0, 99",
    "halt",
  ].join("\n");
  const got = runPipeline(source, { cacheEnabled: false }).snapshot.registers;

  assert.equal(got[0], 0);
  assert.equal(got[3], -5);
  assert.equal(got[4], 11);
  assert.equal(got[5], 0);
  assert.equal(got[6], -5);
  assert.equal(got[7], -5);
  assert.equal(got[8], 24);
  assert.equal(got[9], 0x1fffffff);
  assert.equal(got[10], -1);
  assert.equal(got[11], 1);
  assert.equal(got[12], 0);
  assert.equal(got[13], 0x12345000);
  assert.equal(got[14], 0x1034);
});

test("immediate ALU variants, every branch relation, jal, and jalr are correct", function () {
  const source = [
    "li x1, -16",
    "slli x18, x1, 2",
    "srli x19, x1, 2",
    "srai x20, x1, 2",
    "slti x21, x1, 0",
    "sltiu x22, x1, 0",
    "xori x23, x1, 255",
    "ori x24, x0, 90",
    "andi x25, x1, 15",
    "li t0, -1",
    "li t1, 1",
    "li a0, 0",
    "blt t0, t1, signed_ok",
    "li a0, -101",
    "signed_ok: addi a0, a0, 1",
    "bltu t0, t1, bad_unsigned_lt",
    "addi a0, a0, 2",
    "bgeu t0, t1, unsigned_ge_ok",
    "bad_unsigned_lt: li a0, -102",
    "unsigned_ge_ok: bge t1, t0, signed_ge_ok",
    "li a0, -103",
    "signed_ge_ok: addi a0, a0, 4",
    "beq t1, t1, equal_ok",
    "li a0, -104",
    "equal_ok: addi a0, a0, 8",
    "bne t0, t1, not_equal_ok",
    "li a0, -105",
    "not_equal_ok: jal ra, subroutine",
    "halt",
    "subroutine: addi a0, a0, 16",
    "ret",
  ].join("\n");
  const result = runPipeline(source, { cacheEnabled: false }).snapshot;

  assert.equal(result.registers[18], -64);
  assert.equal(result.registers[19], 0x3ffffffc);
  assert.equal(result.registers[20], -4);
  assert.equal(result.registers[21], 1);
  assert.equal(result.registers[22], 0);
  assert.equal(result.registers[23], -241);
  assert.equal(result.registers[24], 90);
  assert.equal(result.registers[25], 0);
  assert.equal(result.registers[10], 31);
});

test("forwarding, load-use stalls, store data, and branch flushes are correct", function () {
  const result = runPipeline(SAMPLE_PROGRAMS.hazards.source, { cacheEnabled: false });
  const snapshot = result.snapshot;

  assert.equal(snapshot.state, "halted");
  assert.equal(snapshot.registers[10], 13);
  assert.equal(memoryWord(snapshot.memory, 32), 19);
  assert.equal(snapshot.stats.dataStalls, 1);
  assert.ok(snapshot.stats.flushes >= 1);
});

test("every included program matches the independent sequential model", function () {
  Object.keys(SAMPLE_PROGRAMS).forEach(function (key) {
    const source = SAMPLE_PROGRAMS[key].source;
    const pipeline = runPipeline(source);
    const reference = runReference(pipeline.program);
    assert.equal(pipeline.snapshot.state, reference.state, key + " terminal state");
    assert.deepEqual(pipeline.snapshot.registers, reference.registers, key + " registers");
    assert.deepEqual(Buffer.from(pipeline.snapshot.memory), Buffer.from(reference.memory), key + " memory");
  });
});

test("generated dependency programs match the reference model", function () {
  let seed = 0x13579bdf;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  }

  for (let programIndex = 0; programIndex < 30; programIndex += 1) {
    const lines = ["li x1, " + ((random() % 101) - 50), "li x2, " + ((random() % 101) - 50)];
    for (let index = 0; index < 36; index += 1) {
      const destination = 3 + (random() % 12);
      const left = 1 + (random() % 14);
      const right = 1 + (random() % 14);
      const operations = ["add", "sub", "xor", "or", "and", "slt", "sltu"];
      lines.push(operations[random() % operations.length] + " x" + destination + ", x" + left + ", x" + right);
      if (index % 9 === 0) {
        const address = (index % 8) * 4;
        lines.push("sw x" + destination + ", " + address + "(x0)");
        lines.push("lw x15, " + address + "(x0)");
      }
    }
    lines.push("halt");
    const source = lines.join("\n");
    const pipeline = runPipeline(source);
    const reference = runReference(pipeline.program);
    assert.deepEqual(pipeline.snapshot.registers, reference.registers, "generated registers " + programIndex);
    assert.deepEqual(Buffer.from(pipeline.snapshot.memory), Buffer.from(reference.memory), "generated memory " + programIndex);
  }
});

test("adaptive predictor improves the branch-heavy sample", function () {
  const adaptive = runPipeline(SAMPLE_PROGRAMS.branchStress.source, { cacheEnabled: false, predictor: "adaptive" }).snapshot;
  const staticPrediction = runPipeline(SAMPLE_PROGRAMS.branchStress.source, { cacheEnabled: false, predictor: "static" }).snapshot;

  assert.ok(adaptive.stats.branchAccuracy > staticPrediction.stats.branchAccuracy);
  assert.ok(adaptive.stats.cycles < staticPrediction.stats.cycles);
  assert.ok(adaptive.stats.flushes < staticPrediction.stats.flushes);
});

test("two-bit predictor counters saturate in both directions", function () {
  const predictor = new BranchPredictor("adaptive", 16);
  for (let index = 0; index < 10; index += 1) {
    predictor.update(0, true, 40);
  }
  assert.equal(predictor.entries[0].counter, 3);
  assert.equal(predictor.predict(0), 40);
  for (let index = 0; index < 10; index += 1) {
    predictor.update(0, false, 40);
  }
  assert.equal(predictor.entries[0].counter, 0);
  assert.equal(predictor.predict(0), 4);
});

test("cache records misses and hits and remains write-through", function () {
  const memory = new Uint8Array(4096);
  const cache = new DataCache(true);
  const store = cache.begin(0, "store", 0x12345678);
  assert.equal(store.hit, false);
  cache.complete(store, memory);
  const load = cache.begin(0, "load", 0);
  assert.equal(load.hit, true);
  assert.equal(cache.complete(load, memory), 0x12345678);
  assert.equal(memoryWord(memory, 0), 0x12345678);
  assert.equal(cache.misses, 1);
  assert.equal(cache.hits, 1);
});

test("misaligned and out-of-range memory operations fault without crashing", function () {
  const misalignedCpu = new PipelineCPU({ cacheEnabled: false });
  misalignedCpu.load("li x1, 2\nlw x2, 0(x1)\nhalt");
  const misaligned = misalignedCpu.run();
  assert.equal(misaligned.state, "fault");
  assert.match(misaligned.fault.message, /Misaligned/);

  const outOfRangeCpu = new PipelineCPU({ cacheEnabled: false });
  outOfRangeCpu.load("li x1, 4096\nlw x2, 0(x1)\nhalt");
  const outOfRange = outOfRangeCpu.run();
  assert.equal(outOfRange.state, "fault");
  assert.match(outOfRange.fault.message, /outside 4 KiB/);
});

test("pipeline drains at program end and guards against infinite runs", function () {
  const finite = runPipeline("li a0, 42", { cacheEnabled: false }).snapshot;
  assert.equal(finite.state, "complete");
  assert.equal(finite.registers[10], 42);

  const looping = new PipelineCPU({ cacheEnabled: false });
  looping.load("loop: addi a0, a0, 1\nj loop");
  const limited = looping.run(50);
  assert.equal(limited.state, "fault");
  assert.match(limited.fault.message, /limit of 50 cycles/);
});
