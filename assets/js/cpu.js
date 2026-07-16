(function (globalScope) {
  "use strict";

  const ABI_REGISTERS = {
    zero: 0,
    ra: 1,
    sp: 2,
    gp: 3,
    tp: 4,
    t0: 5,
    t1: 6,
    t2: 7,
    s0: 8,
    fp: 8,
    s1: 9,
    a0: 10,
    a1: 11,
    a2: 12,
    a3: 13,
    a4: 14,
    a5: 15,
    a6: 16,
    a7: 17,
    s2: 18,
    s3: 19,
    s4: 20,
    s5: 21,
    s6: 22,
    s7: 23,
    s8: 24,
    s9: 25,
    s10: 26,
    s11: 27,
    t3: 28,
    t4: 29,
    t5: 30,
    t6: 31,
  };

  const ABI_NAMES = [
    "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
    "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
    "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
    "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6",
  ];

  const R_SPECS = {
    add: [0x0, 0x00],
    sub: [0x0, 0x20],
    sll: [0x1, 0x00],
    slt: [0x2, 0x00],
    sltu: [0x3, 0x00],
    xor: [0x4, 0x00],
    srl: [0x5, 0x00],
    sra: [0x5, 0x20],
    or: [0x6, 0x00],
    and: [0x7, 0x00],
  };

  const I_SPECS = {
    addi: 0x0,
    slti: 0x2,
    sltiu: 0x3,
    xori: 0x4,
    ori: 0x6,
    andi: 0x7,
  };

  const SHIFT_I_SPECS = {
    slli: [0x1, 0x00],
    srli: [0x5, 0x00],
    srai: [0x5, 0x20],
  };

  const BRANCH_SPECS = {
    beq: 0x0,
    bne: 0x1,
    blt: 0x4,
    bge: 0x5,
    bltu: 0x6,
    bgeu: 0x7,
  };

  const SAMPLE_PROGRAMS = {
    fibonacci: {
      name: "Fibonacci sequence",
      description: "Build ten Fibonacci values and store them in data memory.",
      source: [
        "# Fibonacci: writes 0, 1, 1, 2, ... to memory",
        "        li   t0, 0          # current value",
        "        li   t1, 1          # next value",
        "        li   t2, 10         # values remaining",
        "        li   a0, 0          # memory cursor",
        "",
        "loop:  sw   t0, 0(a0)",
        "        add  t3, t0, t1",
        "        mv   t0, t1",
        "        mv   t1, t3",
        "        addi a0, a0, 4",
        "        addi t2, t2, -1",
        "        bne  t2, zero, loop",
        "        halt",
      ].join("\n"),
    },
    arraySum: {
      name: "Array sum",
      description: "Initializes an array, then sums it with repeated load-use hazards.",
      source: [
        "# Store five values, then sum them into a0",
        "        li   t0, 3",
        "        sw   t0, 0(zero)",
        "        li   t0, 5",
        "        sw   t0, 4(zero)",
        "        li   t0, 8",
        "        sw   t0, 8(zero)",
        "        li   t0, 13",
        "        sw   t0, 12(zero)",
        "        li   t0, 21",
        "        sw   t0, 16(zero)",
        "",
        "        li   t1, 0          # cursor",
        "        li   t2, 5          # count",
        "        li   a0, 0          # sum",
        "sum:    lw   t3, 0(t1)",
        "        add  a0, a0, t3     # load-use stall",
        "        addi t1, t1, 4",
        "        addi t2, t2, -1",
        "        bne  t2, zero, sum",
        "        halt",
      ].join("\n"),
    },
    branchStress: {
      name: "Branch predictor",
      description: "Exercises a mostly-taken loop and alternating branch pattern.",
      source: [
        "# Compare static and adaptive prediction",
        "        li   t0, 24",
        "        li   t1, 0",
        "        li   a0, 0",
        "loop:  addi t1, t1, 1",
        "        andi t2, t1, 1",
        "        beq  t2, zero, even",
        "        addi a0, a0, 3",
        "        j    next",
        "even:  addi a0, a0, 1",
        "next:  addi t0, t0, -1",
        "        bne  t0, zero, loop",
        "        halt",
      ].join("\n"),
    },
    hazards: {
      name: "Forwarding network",
      description: "A dependency-heavy program covering forwarding, stalls, and flushes.",
      source: [
        "# Dependency and control-hazard validation",
        "        li   t0, 7",
        "        addi t1, t0, 5      # EX/MEM forward",
        "        add  t2, t1, t0     # chained forward",
        "        sw   t2, 32(zero)   # forwarded store data",
        "        lw   t3, 32(zero)",
        "        addi t4, t3, 1      # load-use stall",
        "        beq  t4, t4, taken  # taken: flush next op",
        "        li   a0, 999",
        "taken:  sub  a0, t4, t0",
        "        halt",
      ].join("\n"),
    },
  };

  class AssemblyError extends Error {
    constructor(diagnostics) {
      super(diagnostics.map(function (item) { return item.message; }).join("\n"));
      this.name = "AssemblyError";
      this.diagnostics = diagnostics;
    }
  }

  function toUint32(value) {
    return value >>> 0;
  }

  function toInt32(value) {
    return value | 0;
  }

  function signExtend(value, bits) {
    const shift = 32 - bits;
    return (value << shift) >> shift;
  }

  function hex(value, width) {
    return "0x" + toUint32(value).toString(16).padStart(width || 8, "0");
  }

  function parseRegister(token) {
    const normalized = String(token || "").trim().toLowerCase();
    if (/^x(?:[0-9]|[12][0-9]|3[01])$/.test(normalized)) {
      return Number(normalized.slice(1));
    }
    if (Object.prototype.hasOwnProperty.call(ABI_REGISTERS, normalized)) {
      return ABI_REGISTERS[normalized];
    }
    throw new Error("Unknown register ‘" + token + "’");
  }

  function parseNumber(token) {
    const text = String(token || "").trim().replace(/_/g, "");
    const match = /^([+-]?)(0x[0-9a-f]+|0b[01]+|[0-9]+)$/i.exec(text);
    if (!match) {
      throw new Error("Invalid immediate ‘" + token + "’");
    }
    const sign = match[1] === "-" ? -1 : 1;
    const body = match[2].toLowerCase();
    const radix = body.indexOf("0x") === 0 ? 16 : body.indexOf("0b") === 0 ? 2 : 10;
    const digits = radix === 10 ? body : body.slice(2);
    const parsed = Number.parseInt(digits, radix) * sign;
    if (!Number.isSafeInteger(parsed)) {
      throw new Error("Immediate is outside the supported integer range");
    }
    return parsed;
  }

  function checkRange(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(label + " must be between " + min + " and " + max);
    }
  }

  function tokenizeOperands(text) {
    if (!text.trim()) {
      return [];
    }
    return text
      .replace(/[(),]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function cleanLine(line) {
    let result = line;
    const slash = result.indexOf("//");
    if (slash !== -1) {
      result = result.slice(0, slash);
    }
    const hashIndex = result.indexOf("#");
    const semicolonIndex = result.indexOf(";");
    let end = result.length;
    if (hashIndex !== -1) {
      end = Math.min(end, hashIndex);
    }
    if (semicolonIndex !== -1) {
      end = Math.min(end, semicolonIndex);
    }
    return result.slice(0, end).trim();
  }

  function instructionRecord(name, operands, source, lineNumber) {
    return {
      name: name.toLowerCase(),
      operands: operands.slice(),
      source: source.trim(),
      lineNumber: lineNumber,
      pc: 0,
    };
  }

  function expandPseudo(name, operands, source, lineNumber) {
    const lower = name.toLowerCase();
    if (lower === "nop") {
      return [instructionRecord("addi", ["x0", "x0", "0"], source, lineNumber)];
    }
    if (lower === "mv") {
      if (operands.length !== 2) {
        throw new Error("mv expects two operands");
      }
      return [instructionRecord("addi", [operands[0], operands[1], "0"], source, lineNumber)];
    }
    if (lower === "j") {
      if (operands.length !== 1) {
        throw new Error("j expects one target");
      }
      return [instructionRecord("jal", ["x0", operands[0]], source, lineNumber)];
    }
    if (lower === "jr") {
      if (operands.length !== 1) {
        throw new Error("jr expects one register");
      }
      return [instructionRecord("jalr", ["x0", "0", operands[0]], source, lineNumber)];
    }
    if (lower === "ret") {
      if (operands.length !== 0) {
        throw new Error("ret does not accept operands");
      }
      return [instructionRecord("jalr", ["x0", "0", "ra"], source, lineNumber)];
    }
    if (lower === "halt") {
      if (operands.length !== 0) {
        throw new Error("halt does not accept operands");
      }
      return [instructionRecord("ebreak", [], source, lineNumber)];
    }
    if (lower === "li") {
      if (operands.length !== 2) {
        throw new Error("li expects a destination and immediate");
      }
      const value = toInt32(parseNumber(operands[1]));
      if (value >= -2048 && value <= 2047) {
        return [instructionRecord("addi", [operands[0], "x0", String(value)], source, lineNumber)];
      }
      const upper = (value + 0x800) >> 12;
      const lowerPart = signExtend(value & 0xfff, 12);
      return [
        instructionRecord("lui", [operands[0], String(upper)], source, lineNumber),
        instructionRecord("addi", [operands[0], operands[0], String(lowerPart)], source, lineNumber),
      ];
    }
    return [instructionRecord(lower, operands, source, lineNumber)];
  }

  function encodeR(funct7, rs2, rs1, funct3, rd, opcode) {
    return toUint32(
      ((funct7 & 0x7f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x7) << 12) |
      ((rd & 0x1f) << 7) |
      (opcode & 0x7f),
    );
  }

  function encodeI(immediate, rs1, funct3, rd, opcode) {
    return toUint32(
      ((immediate & 0xfff) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x7) << 12) |
      ((rd & 0x1f) << 7) |
      (opcode & 0x7f),
    );
  }

  function encodeS(immediate, rs2, rs1, funct3, opcode) {
    return toUint32(
      (((immediate >>> 5) & 0x7f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x7) << 12) |
      ((immediate & 0x1f) << 7) |
      (opcode & 0x7f),
    );
  }

  function encodeB(immediate, rs2, rs1, funct3, opcode) {
    return toUint32(
      (((immediate >>> 12) & 0x1) << 31) |
      (((immediate >>> 5) & 0x3f) << 25) |
      ((rs2 & 0x1f) << 20) |
      ((rs1 & 0x1f) << 15) |
      ((funct3 & 0x7) << 12) |
      (((immediate >>> 1) & 0xf) << 8) |
      (((immediate >>> 11) & 0x1) << 7) |
      (opcode & 0x7f),
    );
  }

  function encodeU(immediate, rd, opcode) {
    return toUint32(((immediate & 0xfffff) << 12) | ((rd & 0x1f) << 7) | opcode);
  }

  function encodeJ(immediate, rd, opcode) {
    return toUint32(
      (((immediate >>> 20) & 0x1) << 31) |
      (((immediate >>> 1) & 0x3ff) << 21) |
      (((immediate >>> 11) & 0x1) << 20) |
      (((immediate >>> 12) & 0xff) << 12) |
      ((rd & 0x1f) << 7) |
      opcode,
    );
  }

  function resolveTarget(token, labels, pc) {
    if (Object.prototype.hasOwnProperty.call(labels, token)) {
      return labels[token] - pc;
    }
    return parseNumber(token);
  }

  function requireOperands(entry, count) {
    if (entry.operands.length !== count) {
      throw new Error(entry.name + " expects " + count + " operand" + (count === 1 ? "" : "s"));
    }
  }

  function encodeEntry(entry, labels) {
    const name = entry.name;
    const args = entry.operands;
    if (Object.prototype.hasOwnProperty.call(R_SPECS, name)) {
      requireOperands(entry, 3);
      const spec = R_SPECS[name];
      return encodeR(spec[1], parseRegister(args[2]), parseRegister(args[1]), spec[0], parseRegister(args[0]), 0x33);
    }
    if (Object.prototype.hasOwnProperty.call(I_SPECS, name)) {
      requireOperands(entry, 3);
      const immediate = parseNumber(args[2]);
      checkRange(immediate, -2048, 2047, "Immediate");
      return encodeI(immediate, parseRegister(args[1]), I_SPECS[name], parseRegister(args[0]), 0x13);
    }
    if (Object.prototype.hasOwnProperty.call(SHIFT_I_SPECS, name)) {
      requireOperands(entry, 3);
      const shift = parseNumber(args[2]);
      checkRange(shift, 0, 31, "Shift amount");
      const shiftSpec = SHIFT_I_SPECS[name];
      const encodedImmediate = (shiftSpec[1] << 5) | shift;
      return encodeI(encodedImmediate, parseRegister(args[1]), shiftSpec[0], parseRegister(args[0]), 0x13);
    }
    if (name === "lw") {
      requireOperands(entry, 3);
      const loadImmediate = parseNumber(args[1]);
      checkRange(loadImmediate, -2048, 2047, "Load offset");
      return encodeI(loadImmediate, parseRegister(args[2]), 0x2, parseRegister(args[0]), 0x03);
    }
    if (name === "sw") {
      requireOperands(entry, 3);
      const storeImmediate = parseNumber(args[1]);
      checkRange(storeImmediate, -2048, 2047, "Store offset");
      return encodeS(storeImmediate, parseRegister(args[0]), parseRegister(args[2]), 0x2, 0x23);
    }
    if (Object.prototype.hasOwnProperty.call(BRANCH_SPECS, name)) {
      requireOperands(entry, 3);
      const branchOffset = resolveTarget(args[2], labels, entry.pc);
      checkRange(branchOffset, -4096, 4094, "Branch offset");
      if (branchOffset % 2 !== 0) {
        throw new Error("Branch target must be two-byte aligned");
      }
      return encodeB(branchOffset, parseRegister(args[1]), parseRegister(args[0]), BRANCH_SPECS[name], 0x63);
    }
    if (name === "jal") {
      if (args.length === 1) {
        args.unshift("ra");
      }
      requireOperands(entry, 2);
      const jumpOffset = resolveTarget(args[1], labels, entry.pc);
      checkRange(jumpOffset, -1048576, 1048574, "Jump offset");
      if (jumpOffset % 2 !== 0) {
        throw new Error("Jump target must be two-byte aligned");
      }
      return encodeJ(jumpOffset, parseRegister(args[0]), 0x6f);
    }
    if (name === "jalr") {
      requireOperands(entry, 3);
      const jalrImmediate = parseNumber(args[1]);
      checkRange(jalrImmediate, -2048, 2047, "Jump offset");
      return encodeI(jalrImmediate, parseRegister(args[2]), 0x0, parseRegister(args[0]), 0x67);
    }
    if (name === "lui" || name === "auipc") {
      requireOperands(entry, 2);
      const upper = parseNumber(args[1]);
      checkRange(upper, -524288, 1048575, "Upper immediate");
      return encodeU(upper, parseRegister(args[0]), name === "lui" ? 0x37 : 0x17);
    }
    if (name === "ebreak") {
      requireOperands(entry, 0);
      return 0x00100073;
    }
    throw new Error("Unsupported instruction ‘" + name + "’");
  }

  function assemble(source) {
    const diagnostics = [];
    const labels = Object.create(null);
    const records = [];
    let pc = 0;

    String(source || "").split(/\r?\n/).forEach(function (rawLine, index) {
      const lineNumber = index + 1;
      let line = cleanLine(rawLine);
      if (!line) {
        return;
      }
      try {
        let labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(line);
        while (labelMatch) {
          const label = labelMatch[1];
          if (Object.prototype.hasOwnProperty.call(labels, label)) {
            throw new Error("Duplicate label ‘" + label + "’");
          }
          labels[label] = pc;
          line = line.slice(labelMatch[0].length).trim();
          labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(line);
        }
        if (!line) {
          return;
        }
        const instructionMatch = /^(\S+)(?:\s+(.*))?$/.exec(line);
        const name = instructionMatch[1];
        const operands = tokenizeOperands(instructionMatch[2] || "");
        const expanded = expandPseudo(name, operands, line, lineNumber);
        expanded.forEach(function (record) {
          record.pc = pc;
          records.push(record);
          pc += 4;
        });
      } catch (error) {
        diagnostics.push({ line: lineNumber, message: error.message });
      }
    });

    if (records.length === 0 && diagnostics.length === 0) {
      diagnostics.push({ line: 1, message: "Enter at least one instruction" });
    }

    const instructions = [];
    if (diagnostics.length === 0) {
      records.forEach(function (record) {
        try {
          const word = encodeEntry(record, labels);
          instructions.push({
            pc: record.pc,
            word: word,
            text: record.source,
            lineNumber: record.lineNumber,
            mnemonic: record.name,
          });
        } catch (error) {
          diagnostics.push({ line: record.lineNumber, message: error.message });
        }
      });
    }

    if (diagnostics.length) {
      throw new AssemblyError(diagnostics);
    }

    return {
      source: String(source || ""),
      instructions: instructions,
      words: instructions.map(function (instruction) { return instruction.word; }),
      labels: Object.assign({}, labels),
      byteLength: instructions.length * 4,
    };
  }

  function baseDecoded(name, word, fields) {
    return Object.assign({
      name: name,
      word: toUint32(word),
      rd: 0,
      rs1: 0,
      rs2: 0,
      imm: 0,
      usesRs1: false,
      usesRs2: false,
      writesRd: false,
      memRead: false,
      memWrite: false,
      branch: false,
      jump: false,
      halt: false,
    }, fields || {});
  }

  function decode(word) {
    const unsignedWord = toUint32(word);
    const opcode = unsignedWord & 0x7f;
    const rd = (unsignedWord >>> 7) & 0x1f;
    const funct3 = (unsignedWord >>> 12) & 0x7;
    const rs1 = (unsignedWord >>> 15) & 0x1f;
    const rs2 = (unsignedWord >>> 20) & 0x1f;
    const funct7 = (unsignedWord >>> 25) & 0x7f;

    if (opcode === 0x33) {
      const key = funct3 + ":" + funct7;
      const names = {
        "0:0": "add", "0:32": "sub", "1:0": "sll", "2:0": "slt",
        "3:0": "sltu", "4:0": "xor", "5:0": "srl", "5:32": "sra",
        "6:0": "or", "7:0": "and",
      };
      if (names[key]) {
        return baseDecoded(names[key], word, {
          rd: rd, rs1: rs1, rs2: rs2, usesRs1: true, usesRs2: true, writesRd: true,
        });
      }
    }
    if (opcode === 0x13) {
      const immediate = signExtend(unsignedWord >>> 20, 12);
      const immediateNames = { 0: "addi", 2: "slti", 3: "sltiu", 4: "xori", 6: "ori", 7: "andi" };
      if (Object.prototype.hasOwnProperty.call(immediateNames, funct3)) {
        return baseDecoded(immediateNames[funct3], word, {
          rd: rd, rs1: rs1, imm: immediate, usesRs1: true, writesRd: true,
        });
      }
      if (funct3 === 1 && funct7 === 0) {
        return baseDecoded("slli", word, { rd: rd, rs1: rs1, imm: rs2, usesRs1: true, writesRd: true });
      }
      if (funct3 === 5 && (funct7 === 0 || funct7 === 32)) {
        return baseDecoded(funct7 === 32 ? "srai" : "srli", word, {
          rd: rd, rs1: rs1, imm: rs2, usesRs1: true, writesRd: true,
        });
      }
    }
    if (opcode === 0x03 && funct3 === 2) {
      return baseDecoded("lw", word, {
        rd: rd, rs1: rs1, imm: signExtend(unsignedWord >>> 20, 12),
        usesRs1: true, writesRd: true, memRead: true,
      });
    }
    if (opcode === 0x23 && funct3 === 2) {
      const storeImmediate = (((unsignedWord >>> 25) & 0x7f) << 5) | ((unsignedWord >>> 7) & 0x1f);
      return baseDecoded("sw", word, {
        rs1: rs1, rs2: rs2, imm: signExtend(storeImmediate, 12),
        usesRs1: true, usesRs2: true, memWrite: true,
      });
    }
    if (opcode === 0x63 && Object.prototype.hasOwnProperty.call({ 0: 1, 1: 1, 4: 1, 5: 1, 6: 1, 7: 1 }, funct3)) {
      const branchImmediate =
        (((unsignedWord >>> 31) & 0x1) << 12) |
        (((unsignedWord >>> 7) & 0x1) << 11) |
        (((unsignedWord >>> 25) & 0x3f) << 5) |
        (((unsignedWord >>> 8) & 0xf) << 1);
      const branchNames = { 0: "beq", 1: "bne", 4: "blt", 5: "bge", 6: "bltu", 7: "bgeu" };
      return baseDecoded(branchNames[funct3], word, {
        rs1: rs1, rs2: rs2, imm: signExtend(branchImmediate, 13),
        usesRs1: true, usesRs2: true, branch: true,
      });
    }
    if (opcode === 0x6f) {
      const jumpImmediate =
        (((unsignedWord >>> 31) & 0x1) << 20) |
        (((unsignedWord >>> 12) & 0xff) << 12) |
        (((unsignedWord >>> 20) & 0x1) << 11) |
        (((unsignedWord >>> 21) & 0x3ff) << 1);
      return baseDecoded("jal", word, {
        rd: rd, imm: signExtend(jumpImmediate, 21), writesRd: true, jump: true,
      });
    }
    if (opcode === 0x67 && funct3 === 0) {
      return baseDecoded("jalr", word, {
        rd: rd, rs1: rs1, imm: signExtend(unsignedWord >>> 20, 12),
        usesRs1: true, writesRd: true, jump: true,
      });
    }
    if (opcode === 0x37) {
      return baseDecoded("lui", word, { rd: rd, imm: toInt32(unsignedWord & 0xfffff000), writesRd: true });
    }
    if (opcode === 0x17) {
      return baseDecoded("auipc", word, { rd: rd, imm: toInt32(unsignedWord & 0xfffff000), writesRd: true });
    }
    if (unsignedWord === 0x00100073) {
      return baseDecoded("ebreak", word, { halt: true });
    }
    return baseDecoded("illegal", word, {});
  }

  function readWord(memory, address) {
    if ((address & 3) !== 0) {
      throw new Error("Misaligned word access at " + hex(address));
    }
    if (address < 0 || address + 3 >= memory.length) {
      throw new Error("Memory access outside 4 KiB data memory at " + hex(address));
    }
    return toInt32(
      memory[address] |
      (memory[address + 1] << 8) |
      (memory[address + 2] << 16) |
      (memory[address + 3] << 24),
    );
  }

  function writeWord(memory, address, value) {
    if ((address & 3) !== 0) {
      throw new Error("Misaligned word access at " + hex(address));
    }
    if (address < 0 || address + 3 >= memory.length) {
      throw new Error("Memory access outside 4 KiB data memory at " + hex(address));
    }
    const unsigned = toUint32(value);
    memory[address] = unsigned & 0xff;
    memory[address + 1] = (unsigned >>> 8) & 0xff;
    memory[address + 2] = (unsigned >>> 16) & 0xff;
    memory[address + 3] = (unsigned >>> 24) & 0xff;
  }

  class BranchPredictor {
    constructor(mode, size) {
      this.mode = mode || "adaptive";
      this.size = size || 16;
      this.entries = Array.from({ length: this.size }, function () {
        return { valid: false, tag: 0, target: 0, counter: 1 };
      });
    }

    reset() {
      this.entries.forEach(function (entry) {
        entry.valid = false;
        entry.tag = 0;
        entry.target = 0;
        entry.counter = 1;
      });
    }

    predict(pc) {
      if (this.mode !== "adaptive") {
        return pc + 4;
      }
      const index = (pc >>> 2) % this.size;
      const entry = this.entries[index];
      return entry.valid && entry.tag === (pc >>> 2) && entry.counter >= 2
        ? entry.target
        : pc + 4;
    }

    update(pc, taken, target) {
      if (this.mode !== "adaptive") {
        return;
      }
      const index = (pc >>> 2) % this.size;
      const entry = this.entries[index];
      const tag = pc >>> 2;
      if (!entry.valid || entry.tag !== tag) {
        entry.valid = true;
        entry.tag = tag;
        entry.target = target;
        entry.counter = taken ? 2 : 1;
        return;
      }
      entry.target = target;
      entry.counter = taken ? Math.min(3, entry.counter + 1) : Math.max(0, entry.counter - 1);
    }

    snapshot() {
      return this.entries.map(function (entry, index) {
        return Object.assign({ index: index }, entry);
      });
    }
  }

  class DataCache {
    constructor(enabled) {
      this.enabled = enabled !== false;
      this.lineBytes = 16;
      this.lineCount = 8;
      this.lines = Array.from({ length: this.lineCount }, function () {
        return { valid: false, tag: 0, data: new Uint8Array(16) };
      });
      this.hits = 0;
      this.misses = 0;
    }

    reset() {
      this.hits = 0;
      this.misses = 0;
      this.lines.forEach(function (line) {
        line.valid = false;
        line.tag = 0;
        line.data.fill(0);
      });
    }

    begin(address, kind, value) {
      if ((address & 3) !== 0) {
        throw new Error("Misaligned word access at " + hex(address));
      }
      if (address < 0 || address + 3 >= 4096) {
        throw new Error("Memory access outside 4 KiB data memory at " + hex(address));
      }
      if (!this.enabled) {
        return { direct: true, hit: true, address: address, kind: kind, value: value };
      }
      const block = Math.floor(address / this.lineBytes);
      const index = block % this.lineCount;
      const tag = Math.floor(block / this.lineCount);
      const line = this.lines[index];
      const hit = line.valid && line.tag === tag;
      if (hit) {
        this.hits += 1;
      } else {
        this.misses += 1;
      }
      return {
        direct: false,
        hit: hit,
        address: address,
        kind: kind,
        value: value,
        block: block,
        index: index,
        tag: tag,
        offset: address % this.lineBytes,
      };
    }

    complete(operation, memory) {
      if (operation.direct) {
        if (operation.kind === "load") {
          return readWord(memory, operation.address);
        }
        writeWord(memory, operation.address, operation.value);
        return 0;
      }
      const line = this.lines[operation.index];
      if (!operation.hit) {
        const base = operation.block * this.lineBytes;
        line.valid = true;
        line.tag = operation.tag;
        line.data.set(memory.subarray(base, base + this.lineBytes));
      }
      if (operation.kind === "load") {
        return readWord(line.data, operation.offset);
      }
      writeWord(line.data, operation.offset, operation.value);
      writeWord(memory, operation.address, operation.value);
      return 0;
    }

    snapshot() {
      return this.lines.map(function (line, index) {
        const words = [];
        for (let offset = 0; offset < 16; offset += 4) {
          words.push(readWord(line.data, offset));
        }
        return { index: index, valid: line.valid, tag: line.tag, words: words };
      });
    }
  }

  function executeOperation(decoded, pc, left, right) {
    let result = 0;
    let branchTaken = false;
    let actualNext = pc + 4;
    switch (decoded.name) {
      case "add": result = toInt32(left + right); break;
      case "sub": result = toInt32(left - right); break;
      case "sll": result = toInt32(left << (right & 31)); break;
      case "slt": result = left < right ? 1 : 0; break;
      case "sltu": result = toUint32(left) < toUint32(right) ? 1 : 0; break;
      case "xor": result = toInt32(left ^ right); break;
      case "srl": result = toInt32(toUint32(left) >>> (right & 31)); break;
      case "sra": result = toInt32(left >> (right & 31)); break;
      case "or": result = toInt32(left | right); break;
      case "and": result = toInt32(left & right); break;
      case "addi": result = toInt32(left + decoded.imm); break;
      case "slti": result = left < decoded.imm ? 1 : 0; break;
      case "sltiu": result = toUint32(left) < toUint32(decoded.imm) ? 1 : 0; break;
      case "xori": result = toInt32(left ^ decoded.imm); break;
      case "ori": result = toInt32(left | decoded.imm); break;
      case "andi": result = toInt32(left & decoded.imm); break;
      case "slli": result = toInt32(left << decoded.imm); break;
      case "srli": result = toInt32(toUint32(left) >>> decoded.imm); break;
      case "srai": result = toInt32(left >> decoded.imm); break;
      case "lui": result = decoded.imm; break;
      case "auipc": result = toInt32(pc + decoded.imm); break;
      case "lw":
      case "sw": result = toInt32(left + decoded.imm); break;
      case "beq": branchTaken = left === right; break;
      case "bne": branchTaken = left !== right; break;
      case "blt": branchTaken = left < right; break;
      case "bge": branchTaken = left >= right; break;
      case "bltu": branchTaken = toUint32(left) < toUint32(right); break;
      case "bgeu": branchTaken = toUint32(left) >= toUint32(right); break;
      case "jal": result = toInt32(pc + 4); branchTaken = true; actualNext = toInt32(pc + decoded.imm); break;
      case "jalr": result = toInt32(pc + 4); branchTaken = true; actualNext = toInt32((left + decoded.imm) & ~1); break;
      case "ebreak": break;
      default: throw new Error("Illegal instruction " + hex(decoded.word));
    }
    if (decoded.branch) {
      actualNext = branchTaken ? toInt32(pc + decoded.imm) : pc + 4;
    }
    if ((decoded.branch || decoded.jump) && (actualNext & 3) !== 0) {
      throw new Error("Control transfer to unaligned address " + hex(actualNext));
    }
    return { result: result, branchTaken: branchTaken, actualNext: actualNext };
  }

  class PipelineCPU {
    constructor(options) {
      this.options = Object.assign({
        predictor: "adaptive",
        cacheEnabled: true,
        cacheMissLatency: 3,
        memorySize: 4096,
      }, options || {});
      this.program = null;
      this.programMap = new Map();
      this.registers = new Int32Array(32);
      this.memory = new Uint8Array(this.options.memorySize);
      this.predictor = new BranchPredictor(this.options.predictor, 16);
      this.cache = new DataCache(this.options.cacheEnabled);
      this.resetState();
    }

    load(sourceOrProgram) {
      this.program = typeof sourceOrProgram === "string" ? assemble(sourceOrProgram) : sourceOrProgram;
      this.programMap = new Map();
      this.program.instructions.forEach((instruction) => {
        this.programMap.set(instruction.pc, instruction);
      });
      this.reset();
      return this.program;
    }

    configure(options) {
      this.options = Object.assign({}, this.options, options || {});
      this.predictor = new BranchPredictor(this.options.predictor, 16);
      this.cache = new DataCache(this.options.cacheEnabled);
      if (this.program) {
        this.reset();
      }
    }

    resetState() {
      this.pc = 0;
      this.ifid = null;
      this.idex = null;
      this.exmem = null;
      this.memwb = null;
      this.pendingMemory = null;
      this.fetchStopped = false;
      this.state = this.program ? "ready" : "empty";
      this.fault = null;
      this.lastEvents = [];
      this.changedRegisters = [];
      this.stats = {
        cycles: 0,
        retired: 0,
        dataStalls: 0,
        cacheStalls: 0,
        flushes: 0,
        branches: 0,
        predictions: 0,
        correctPredictions: 0,
      };
    }

    reset() {
      this.registers.fill(0);
      this.memory.fill(0);
      this.predictor.reset();
      this.cache.reset();
      this.resetState();
      this.state = this.program ? "ready" : "empty";
    }

    fail(message, latch) {
      this.state = "fault";
      this.fault = {
        message: message,
        pc: latch ? latch.pc : this.pc,
        lineNumber: latch && latch.meta ? latch.meta.lineNumber : null,
      };
      this.fetchStopped = true;
      this.ifid = null;
      this.idex = null;
      this.exmem = null;
      this.memwb = null;
      this.pendingMemory = null;
      this.lastEvents.push({ type: "fault", message: message });
    }

    fetchInstruction() {
      if (this.fetchStopped) {
        return null;
      }
      if (this.pc === this.program.byteLength) {
        return null;
      }
      const meta = this.programMap.get(this.pc);
      if (!meta) {
        throw new Error("Instruction fetch outside the program at " + hex(this.pc));
      }
      const decoded = decode(meta.word);
      if (decoded.name === "illegal") {
        throw new Error("Illegal instruction at " + hex(this.pc));
      }
      let predictedNext = this.pc + 4;
      if (decoded.branch) {
        predictedNext = this.predictor.predict(this.pc);
      } else if (decoded.name === "jal") {
        predictedNext = toInt32(this.pc + decoded.imm);
      }
      const latch = {
        pc: this.pc,
        meta: meta,
        decoded: decoded,
        predictedNext: predictedNext,
      };
      this.pc = predictedNext;
      return latch;
    }

    forwardedValue(registerIndex, oldExmem, oldMemwb) {
      if (registerIndex === 0) {
        return { value: 0, source: null };
      }
      if (
        oldExmem && oldExmem.decoded.writesRd && !oldExmem.decoded.memRead &&
        oldExmem.decoded.rd === registerIndex && registerIndex !== 0
      ) {
        return { value: oldExmem.result, source: "MEM" };
      }
      if (
        oldMemwb && oldMemwb.decoded.writesRd &&
        oldMemwb.decoded.rd === registerIndex && registerIndex !== 0
      ) {
        return { value: oldMemwb.writeValue, source: "WB" };
      }
      return { value: this.registers[registerIndex], source: null };
    }

    executeLatch(latch, oldExmem, oldMemwb) {
      if (!latch) {
        return { latch: null, redirect: null, halt: false };
      }
      const decoded = latch.decoded;
      const left = this.forwardedValue(decoded.rs1, oldExmem, oldMemwb);
      const right = this.forwardedValue(decoded.rs2, oldExmem, oldMemwb);
      if (left.source) {
        this.lastEvents.push({ type: "forward", message: left.source + " → EX forwarded into " + ABI_NAMES[decoded.rs1] });
      }
      if (right.source) {
        this.lastEvents.push({ type: "forward", message: right.source + " → EX forwarded into " + ABI_NAMES[decoded.rs2] });
      }
      const operation = executeOperation(decoded, latch.pc, left.value, right.value);
      let redirect = null;
      if (decoded.branch) {
        this.stats.branches += 1;
        this.stats.predictions += 1;
        const target = toInt32(latch.pc + decoded.imm);
        this.predictor.update(latch.pc, operation.branchTaken, target);
        if (latch.predictedNext === operation.actualNext) {
          this.stats.correctPredictions += 1;
          this.lastEvents.push({ type: "predict", message: "Branch prediction correct at " + hex(latch.pc) });
        } else {
          redirect = operation.actualNext;
        }
      } else if (decoded.jump && latch.predictedNext !== operation.actualNext) {
        redirect = operation.actualNext;
      }
      return {
        latch: {
          pc: latch.pc,
          meta: latch.meta,
          decoded: decoded,
          result: operation.result,
          storeValue: right.value,
        },
        redirect: redirect,
        halt: decoded.halt,
      };
    }

    completeMemory(latch, operation) {
      const decoded = latch.decoded;
      let writeValue = latch.result;
      if (decoded.memRead || decoded.memWrite) {
        const memoryResult = this.cache.complete(operation, this.memory);
        if (decoded.memRead) {
          writeValue = memoryResult;
        }
      }
      return {
        pc: latch.pc,
        meta: latch.meta,
        decoded: decoded,
        writeValue: writeValue,
      };
    }

    pipelineEmpty() {
      return !this.ifid && !this.idex && !this.exmem && !this.memwb && !this.pendingMemory;
    }

    step() {
      if (!this.program || this.state === "halted" || this.state === "complete" || this.state === "fault") {
        return this.snapshot();
      }
      this.state = "running";
      this.stats.cycles += 1;
      this.lastEvents = [];
      this.changedRegisters = [];

      const oldIfid = this.ifid;
      const oldIdex = this.idex;
      const oldExmem = this.exmem;
      const oldMemwb = this.memwb;

      if (oldMemwb) {
        const decoded = oldMemwb.decoded;
        if (decoded.writesRd && decoded.rd !== 0) {
          const nextValue = toInt32(oldMemwb.writeValue);
          if (this.registers[decoded.rd] !== nextValue) {
            this.changedRegisters.push(decoded.rd);
          }
          this.registers[decoded.rd] = nextValue;
        }
        this.registers[0] = 0;
        this.stats.retired += 1;
        if (decoded.halt) {
          this.state = "halted";
          this.fetchStopped = true;
          this.ifid = null;
          this.idex = null;
          this.exmem = null;
          this.memwb = null;
          this.lastEvents.push({ type: "halt", message: "Program retired HALT cleanly" });
          return this.snapshot();
        }
      }

      let nextMemwb = null;
      try {
        if (this.pendingMemory) {
          this.pendingMemory.remaining -= 1;
          this.stats.cacheStalls += 1;
          if (this.pendingMemory.remaining > 0) {
            this.lastEvents.push({ type: "cache", message: "Cache refill in progress — pipeline frozen" });
            this.memwb = null;
            return this.snapshot();
          }
          nextMemwb = this.completeMemory(this.pendingMemory.latch, this.pendingMemory.operation);
          this.pendingMemory = null;
          this.lastEvents.push({ type: "cache", message: "Cache line refilled — pipeline resumed" });
        } else if (oldExmem) {
          if (oldExmem.decoded.memRead || oldExmem.decoded.memWrite) {
            const operation = this.cache.begin(
              oldExmem.result,
              oldExmem.decoded.memRead ? "load" : "store",
              oldExmem.storeValue,
            );
            if (this.cache.enabled && !operation.hit && this.options.cacheMissLatency > 1) {
              this.pendingMemory = {
                latch: oldExmem,
                operation: operation,
                remaining: this.options.cacheMissLatency - 1,
              };
              this.stats.cacheStalls += 1;
              this.lastEvents.push({ type: "cache", message: "D-cache miss at " + hex(oldExmem.result) + " — pipeline frozen" });
              this.memwb = null;
              return this.snapshot();
            }
            nextMemwb = this.completeMemory(oldExmem, operation);
            const directAccess = operation.direct;
            this.lastEvents.push({
              type: directAccess ? "memory" : operation.hit ? "cache-hit" : "cache",
              message: directAccess
                ? "Direct memory access at " + hex(oldExmem.result)
                : operation.hit
                  ? "D-cache hit at " + hex(oldExmem.result)
                  : "D-cache line filled at " + hex(oldExmem.result),
            });
          } else {
            nextMemwb = {
              pc: oldExmem.pc,
              meta: oldExmem.meta,
              decoded: oldExmem.decoded,
              writeValue: oldExmem.result,
            };
          }
        }
      } catch (error) {
        this.fail(error.message, oldExmem);
        return this.snapshot();
      }

      let execution;
      try {
        execution = this.executeLatch(oldIdex, oldExmem, oldMemwb);
      } catch (error) {
        this.fail(error.message, oldIdex);
        return this.snapshot();
      }

      let nextIdex = null;
      let nextIfid = null;
      let controlChanged = false;

      if (execution.halt) {
        this.fetchStopped = true;
        this.stats.flushes += oldIfid ? 1 : 0;
        this.lastEvents.push({ type: "halt", message: "HALT reached EX — draining older instructions" });
        controlChanged = true;
      } else if (execution.redirect !== null) {
        this.pc = execution.redirect;
        this.stats.flushes += 1;
        this.lastEvents.push({ type: "flush", message: "Control redirect to " + hex(execution.redirect) + " — younger instruction flushed" });
        controlChanged = true;
      }

      if (!controlChanged) {
        const decodedInId = oldIfid ? oldIfid.decoded : null;
        const loadUseHazard = Boolean(
          oldIdex && oldIdex.decoded.memRead && oldIdex.decoded.rd !== 0 && decodedInId &&
          ((decodedInId.usesRs1 && decodedInId.rs1 === oldIdex.decoded.rd) ||
            (decodedInId.usesRs2 && decodedInId.rs2 === oldIdex.decoded.rd)),
        );
        if (loadUseHazard) {
          nextIfid = oldIfid;
          nextIdex = null;
          this.stats.dataStalls += 1;
          this.lastEvents.push({ type: "stall", message: "Load-use hazard on " + ABI_NAMES[oldIdex.decoded.rd] + " — one bubble inserted" });
        } else {
          nextIdex = oldIfid;
          try {
            nextIfid = this.fetchInstruction();
          } catch (error) {
            this.fail(error.message, null);
            return this.snapshot();
          }
        }
      }

      this.memwb = nextMemwb;
      this.exmem = execution.latch;
      this.idex = nextIdex;
      this.ifid = nextIfid;

      if (
        this.state === "running" && this.pc === this.program.byteLength &&
        this.pipelineEmpty()
      ) {
        this.state = "complete";
      }
      return this.snapshot();
    }

    run(maxCycles) {
      const limit = maxCycles || 10000;
      let steps = 0;
      while (!["halted", "complete", "fault"].includes(this.state) && steps < limit) {
        this.step();
        steps += 1;
      }
      if (steps >= limit && !["halted", "complete", "fault"].includes(this.state)) {
        this.fail("Execution limit of " + limit + " cycles reached", null);
      }
      return this.snapshot();
    }

    snapshot() {
      const cacheAccesses = this.cache.hits + this.cache.misses;
      const predictions = this.stats.predictions;
      return {
        state: this.state,
        pc: this.pc,
        registers: Array.from(this.registers),
        memory: this.memory,
        pipeline: {
          IF: !this.fetchStopped && this.program ? this.programMap.get(this.pc) || null : null,
          ID: this.ifid,
          EX: this.idex,
          MEM: this.exmem,
          WB: this.memwb,
        },
        stats: Object.assign({}, this.stats, {
          cpi: this.stats.retired ? this.stats.cycles / this.stats.retired : 0,
          branchAccuracy: predictions ? this.stats.correctPredictions / predictions : 0,
          cacheHitRate: cacheAccesses ? this.cache.hits / cacheAccesses : 0,
          cacheHits: this.cache.hits,
          cacheMisses: this.cache.misses,
        }),
        events: this.lastEvents.slice(),
        changedRegisters: this.changedRegisters.slice(),
        cache: this.cache.snapshot(),
        predictor: this.predictor.snapshot(),
        fault: this.fault,
      };
    }
  }

  function executeReferenceInstruction(decoded, pc, registers, memory) {
    const left = registers[decoded.rs1] | 0;
    const right = registers[decoded.rs2] | 0;
    let writeValue = 0;
    let shouldWrite = decoded.writesRd;
    let nextPc = pc + 4;
    switch (decoded.name) {
      case "add": writeValue = (left + right) | 0; break;
      case "sub": writeValue = (left - right) | 0; break;
      case "sll": writeValue = left << (right & 31); break;
      case "slt": writeValue = left < right ? 1 : 0; break;
      case "sltu": writeValue = (left >>> 0) < (right >>> 0) ? 1 : 0; break;
      case "xor": writeValue = left ^ right; break;
      case "srl": writeValue = (left >>> (right & 31)) | 0; break;
      case "sra": writeValue = left >> (right & 31); break;
      case "or": writeValue = left | right; break;
      case "and": writeValue = left & right; break;
      case "addi": writeValue = (left + decoded.imm) | 0; break;
      case "slti": writeValue = left < decoded.imm ? 1 : 0; break;
      case "sltiu": writeValue = (left >>> 0) < (decoded.imm >>> 0) ? 1 : 0; break;
      case "xori": writeValue = left ^ decoded.imm; break;
      case "ori": writeValue = left | decoded.imm; break;
      case "andi": writeValue = left & decoded.imm; break;
      case "slli": writeValue = left << decoded.imm; break;
      case "srli": writeValue = (left >>> decoded.imm) | 0; break;
      case "srai": writeValue = left >> decoded.imm; break;
      case "lui": writeValue = decoded.imm; break;
      case "auipc": writeValue = (pc + decoded.imm) | 0; break;
      case "lw": writeValue = readWord(memory, (left + decoded.imm) | 0); break;
      case "sw":
        writeWord(memory, (left + decoded.imm) | 0, right);
        shouldWrite = false;
        break;
      case "beq": if (left === right) { nextPc = (pc + decoded.imm) | 0; } break;
      case "bne": if (left !== right) { nextPc = (pc + decoded.imm) | 0; } break;
      case "blt": if (left < right) { nextPc = (pc + decoded.imm) | 0; } break;
      case "bge": if (left >= right) { nextPc = (pc + decoded.imm) | 0; } break;
      case "bltu": if ((left >>> 0) < (right >>> 0)) { nextPc = (pc + decoded.imm) | 0; } break;
      case "bgeu": if ((left >>> 0) >= (right >>> 0)) { nextPc = (pc + decoded.imm) | 0; } break;
      case "jal":
        writeValue = (pc + 4) | 0;
        nextPc = (pc + decoded.imm) | 0;
        break;
      case "jalr":
        writeValue = (pc + 4) | 0;
        nextPc = ((left + decoded.imm) & ~1) | 0;
        break;
      case "ebreak":
        return { halted: true, nextPc: pc };
      default:
        throw new Error("Reference model decoded an illegal instruction");
    }
    if ((nextPc & 3) !== 0) {
      throw new Error("Reference control transfer to unaligned address " + hex(nextPc));
    }
    if (shouldWrite && decoded.rd !== 0) {
      registers[decoded.rd] = writeValue | 0;
    }
    registers[0] = 0;
    return { halted: false, nextPc: nextPc };
  }

  function runReference(sourceOrProgram, options) {
    const program = typeof sourceOrProgram === "string" ? assemble(sourceOrProgram) : sourceOrProgram;
    const map = new Map();
    program.instructions.forEach(function (instruction) { map.set(instruction.pc, instruction); });
    const registers = new Int32Array(32);
    const memory = new Uint8Array((options && options.memorySize) || 4096);
    let pc = 0;
    let steps = 0;
    const limit = (options && options.maxSteps) || 10000;
    let state = "running";
    while (steps < limit) {
      if (pc === program.byteLength) {
        state = "complete";
        break;
      }
      const meta = map.get(pc);
      if (!meta) {
        throw new Error("Reference fetch outside program at " + hex(pc));
      }
      const decoded = decode(meta.word);
      if (decoded.name === "illegal") {
        throw new Error("Reference model decoded an illegal instruction");
      }
      const result = executeReferenceInstruction(decoded, pc, registers, memory);
      if (result.halted) {
        state = "halted";
        steps += 1;
        break;
      }
      pc = result.nextPc;
      steps += 1;
    }
    if (steps >= limit && state === "running") {
      throw new Error("Reference execution limit reached");
    }
    return { state: state, pc: pc, steps: steps, registers: Array.from(registers), memory: memory };
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function mountCpuLab() {
    if (typeof document === "undefined") {
      return null;
    }
    const root = document.getElementById("cpu-lab");
    if (!root) {
      return null;
    }

    const editor = document.getElementById("cpu-source");
    const lineNumbers = document.getElementById("cpu-line-numbers");
    const sampleSelect = document.getElementById("cpu-sample");
    const assembleButton = document.getElementById("cpu-assemble");
    const resetButton = document.getElementById("cpu-reset");
    const stepButton = document.getElementById("cpu-step");
    const runButton = document.getElementById("cpu-run");
    const speedSelect = document.getElementById("cpu-speed");
    const predictorSelect = document.getElementById("cpu-predictor");
    const cacheToggle = document.getElementById("cpu-cache-toggle");
    const diagnostic = document.getElementById("cpu-diagnostic");
    const listing = document.getElementById("cpu-listing");
    const eventFeed = document.getElementById("cpu-events");
    const registerGrid = document.getElementById("cpu-registers");
    const memoryGrid = document.getElementById("cpu-memory");
    const cacheGrid = document.getElementById("cpu-cache");
    const predictorGrid = document.getElementById("cpu-predictor-table");
    const stateLabel = document.getElementById("cpu-state");
    const loader = document.getElementById("cpu-loader");
    const stageElements = Array.from(root.querySelectorAll("[data-cpu-stage]"));
    const telemetry = {
      pc: document.getElementById("cpu-stat-pc"),
      cycles: document.getElementById("cpu-stat-cycles"),
      retired: document.getElementById("cpu-stat-retired"),
      cpi: document.getElementById("cpu-stat-cpi"),
      stalls: document.getElementById("cpu-stat-stalls"),
      branches: document.getElementById("cpu-stat-branches"),
      cache: document.getElementById("cpu-stat-cache"),
    };

    let cpu = new PipelineCPU({ predictor: predictorSelect.value, cacheEnabled: cacheToggle.checked });
    let running = false;
    let active = false;
    let frameId = 0;
    let previousTime = 0;
    let cycleBudget = 0;
    let assembledSource = "";
    let activeInspector = "registers";

    Object.keys(SAMPLE_PROGRAMS).forEach(function (key) {
      const option = createElement("option", "", SAMPLE_PROGRAMS[key].name);
      option.value = key;
      sampleSelect.appendChild(option);
    });

    const registerCells = Array.from({ length: 32 }, function (_, index) {
      const cell = createElement("div", "cpu-register");
      cell.dataset.register = String(index);
      const name = createElement("span", "cpu-register__name", "x" + index + " · " + ABI_NAMES[index]);
      const value = createElement("strong", "cpu-register__value", "0x00000000");
      const signed = createElement("small", "cpu-register__signed", "0");
      cell.append(name, value, signed);
      registerGrid.appendChild(cell);
      return { cell: cell, value: value, signed: signed };
    });

    function setDiagnostic(message, type) {
      diagnostic.textContent = message;
      diagnostic.dataset.type = type || "info";
    }

    function updateLineNumbers() {
      const count = Math.max(1, editor.value.split(/\r?\n/).length);
      const numbers = [];
      for (let index = 1; index <= count; index += 1) {
        numbers.push(String(index));
      }
      lineNumbers.textContent = numbers.join("\n");
    }

    function renderListing(program, activeLines) {
      if (program) {
        listing.innerHTML = "";
        program.instructions.forEach(function (instruction) {
          const row = createElement("div", "cpu-listing__row");
          row.dataset.pc = String(instruction.pc);
          row.dataset.line = String(instruction.lineNumber);
          row.append(
            createElement("span", "cpu-listing__pc", hex(instruction.pc, 4)),
            createElement("span", "cpu-listing__word", hex(instruction.word)),
            createElement("span", "cpu-listing__source", instruction.text),
          );
          listing.appendChild(row);
        });
      }
      const lines = activeLines || {};
      Array.from(listing.children).forEach(function (row) {
        row.classList.toggle("is-active", Boolean(lines[row.dataset.pc]));
        row.dataset.stage = lines[row.dataset.pc] || "";
      });
    }

    function formatStage(stageName, payload) {
      if (!payload) {
        return { pc: "—", instruction: "BUBBLE", detail: "No valid instruction" };
      }
      const meta = payload.meta || payload;
      const decoded = payload.decoded || (meta.word !== undefined ? decode(meta.word) : null);
      let detail = decoded ? decoded.name.toUpperCase() : "FETCH";
      if (stageName === "IF") {
        detail = "Next instruction fetch";
      } else if (decoded && decoded.memRead) {
        detail = "Load from data memory";
      } else if (decoded && decoded.memWrite) {
        detail = "Store to data memory";
      } else if (decoded && decoded.branch) {
        detail = "Conditional control flow";
      } else if (decoded && decoded.jump) {
        detail = "Jump and link";
      } else if (decoded && decoded.halt) {
        detail = "Drain pipeline and stop";
      }
      return {
        pc: hex(payload.pc !== undefined ? payload.pc : meta.pc, 4),
        instruction: meta.text || decoded.name,
        detail: detail,
      };
    }

    function renderInspector(snapshot) {
      if (activeInspector === "registers") {
        registerCells.forEach(function (parts, index) {
          const value = snapshot.registers[index];
          parts.value.textContent = hex(value);
          parts.signed.textContent = String(value);
          parts.cell.classList.toggle("is-changed", snapshot.changedRegisters.includes(index));
          parts.cell.classList.toggle("is-zero", index === 0);
        });
      } else if (activeInspector === "memory") {
        memoryGrid.innerHTML = "";
        let shown = 0;
        for (let address = 0; address < snapshot.memory.length && shown < 32; address += 4) {
          const value = readWord(snapshot.memory, address);
          if (value !== 0 || address < 32) {
            const row = createElement("div", "cpu-table-row");
            row.append(createElement("span", "", hex(address, 4)), createElement("strong", "", hex(value)), createElement("small", "", String(value)));
            memoryGrid.appendChild(row);
            shown += 1;
          }
        }
      } else if (activeInspector === "cache") {
        cacheGrid.innerHTML = "";
        snapshot.cache.forEach(function (line) {
          const row = createElement("div", "cpu-table-row cpu-table-row--cache");
          row.classList.toggle("is-valid", line.valid);
          row.append(
            createElement("span", "", "L" + line.index),
            createElement("strong", "", line.valid ? "TAG " + hex(line.tag, 2) : "INVALID"),
            createElement("small", "", line.words.map(function (word) { return hex(word); }).join("  ")),
          );
          cacheGrid.appendChild(row);
        });
      } else if (activeInspector === "predictor") {
        predictorGrid.innerHTML = "";
        snapshot.predictor.forEach(function (entry) {
          const row = createElement("div", "cpu-table-row cpu-table-row--predictor");
          row.classList.toggle("is-valid", entry.valid);
          const states = ["SNT", "WNT", "WT", "ST"];
          row.append(
            createElement("span", "", String(entry.index).padStart(2, "0")),
            createElement("strong", "", entry.valid ? states[entry.counter] : "EMPTY"),
            createElement("small", "", entry.valid ? hex(entry.tag << 2, 4) + " → " + hex(entry.target, 4) : "No branch recorded"),
          );
          predictorGrid.appendChild(row);
        });
      }
    }

    function render() {
      const snapshot = cpu.snapshot();
      root.dataset.cpuState = snapshot.state;
      const stateText = snapshot.state.toUpperCase();
      if (stateLabel.textContent !== stateText) {
        stateLabel.textContent = stateText;
      }
      stateLabel.dataset.state = snapshot.state;
      runButton.textContent = running ? "Pause" : "Run";
      runButton.setAttribute("aria-pressed", String(running));
      const terminal = ["halted", "complete", "fault"].includes(snapshot.state);
      stepButton.disabled = terminal || snapshot.state === "empty";
      runButton.disabled = terminal || snapshot.state === "empty";

      const activeLines = {};
      stageElements.forEach(function (stageElement) {
        const stageName = stageElement.dataset.cpuStage;
        const payload = snapshot.pipeline[stageName];
        const formatted = formatStage(stageName, payload);
        stageElement.classList.toggle("is-bubble", !payload);
        stageElement.querySelector("[data-stage-pc]").textContent = formatted.pc;
        stageElement.querySelector("[data-stage-instruction]").textContent = formatted.instruction;
        stageElement.querySelector("[data-stage-detail]").textContent = formatted.detail;
        if (payload) {
          const pcValue = payload.pc !== undefined ? payload.pc : payload.pc;
          activeLines[String(pcValue)] = stageName;
        }
      });
      renderListing(null, activeLines);

      eventFeed.innerHTML = "";
      const events = snapshot.events.length
        ? snapshot.events
        : [{ type: "idle", message: snapshot.state === "ready" ? "Ready to execute cycle 1" : "No pipeline event this cycle" }];
      events.slice(-4).forEach(function (event) {
        const item = createElement("li", "cpu-event cpu-event--" + event.type, event.message);
        eventFeed.appendChild(item);
      });

      telemetry.pc.textContent = hex(snapshot.pc, 4);
      telemetry.cycles.textContent = String(snapshot.stats.cycles);
      telemetry.retired.textContent = String(snapshot.stats.retired);
      telemetry.cpi.textContent = snapshot.stats.cpi ? snapshot.stats.cpi.toFixed(2) : "—";
      telemetry.stalls.textContent = String(snapshot.stats.dataStalls + snapshot.stats.cacheStalls);
      telemetry.branches.textContent = snapshot.stats.predictions ? Math.round(snapshot.stats.branchAccuracy * 100) + "%" : "—";
      telemetry.cache.textContent = snapshot.stats.cacheHits + snapshot.stats.cacheMisses
        ? Math.round(snapshot.stats.cacheHitRate * 100) + "%"
        : "—";

      renderInspector(snapshot);
      if (snapshot.state === "fault" && snapshot.fault) {
        setDiagnostic(
          (snapshot.fault.lineNumber ? "Line " + snapshot.fault.lineNumber + ": " : "") + snapshot.fault.message,
          "error",
        );
      } else if (snapshot.state === "halted") {
        setDiagnostic("Program halted cleanly after " + snapshot.stats.cycles + " cycles · CPI " + snapshot.stats.cpi.toFixed(2), "success");
      } else if (snapshot.state === "complete") {
        setDiagnostic("Program reached the end of instruction memory", "success");
      }
    }

    function stopRunning() {
      running = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
      previousTime = 0;
      cycleBudget = 0;
      render();
    }

    function animationLoop(timestamp) {
      if (!running || !active) {
        frameId = 0;
        return;
      }
      if (!previousTime) {
        previousTime = timestamp;
      }
      const elapsed = Math.min(100, timestamp - previousTime);
      previousTime = timestamp;
      cycleBudget += elapsed * Number(speedSelect.value) / 1000;
      const cycles = Math.min(24, Math.floor(cycleBudget));
      if (cycles > 0) {
        cycleBudget -= cycles;
        for (let index = 0; index < cycles; index += 1) {
          cpu.step();
          if (["halted", "complete", "fault"].includes(cpu.state)) {
            running = false;
            break;
          }
        }
        render();
      }
      if (running && active) {
        frameId = requestAnimationFrame(animationLoop);
      } else {
        frameId = 0;
        render();
      }
    }

    function startRunning() {
      if (["halted", "complete", "fault"].includes(cpu.state)) {
        return;
      }
      running = true;
      render();
      if (active && !frameId) {
        frameId = requestAnimationFrame(animationLoop);
      }
    }

    function assembleEditor(announce) {
      stopRunning();
      try {
        cpu = new PipelineCPU({ predictor: predictorSelect.value, cacheEnabled: cacheToggle.checked, cacheMissLatency: 3 });
        const program = cpu.load(editor.value);
        assembledSource = editor.value;
        renderListing(program, {});
        setDiagnostic(program.instructions.length + " instructions assembled · " + program.byteLength + " bytes", "success");
        render();
        if (announce) {
          diagnostic.focus({ preventScroll: true });
        }
        return true;
      } catch (error) {
        if (error instanceof AssemblyError) {
          const first = error.diagnostics[0];
          setDiagnostic("Line " + first.line + ": " + first.message, "error");
        } else {
          setDiagnostic(error.message, "error");
        }
        listing.innerHTML = "";
        render();
        return false;
      }
    }

    sampleSelect.addEventListener("change", function () {
      editor.value = SAMPLE_PROGRAMS[sampleSelect.value].source;
      editor.scrollTop = 0;
      lineNumbers.style.transform = "translateY(0)";
      updateLineNumbers();
      assembleEditor(false);
    });
    assembleButton.addEventListener("click", function () { assembleEditor(true); });
    resetButton.addEventListener("click", function () {
      stopRunning();
      if (editor.value !== assembledSource) {
        assembleEditor(false);
      } else {
        cpu.reset();
        setDiagnostic("Pipeline, cache, predictor, registers, and memory reset", "info");
        render();
      }
    });
    stepButton.addEventListener("click", function () {
      stopRunning();
      if (editor.value !== assembledSource && !assembleEditor(false)) {
        return;
      }
      cpu.step();
      render();
    });
    runButton.addEventListener("click", function () {
      if (running) {
        stopRunning();
      } else {
        if (editor.value !== assembledSource && !assembleEditor(false)) {
          return;
        }
        startRunning();
      }
    });
    predictorSelect.addEventListener("change", function () {
      assembleEditor(false);
      setDiagnostic("Predictor changed to " + predictorSelect.options[predictorSelect.selectedIndex].text + " · execution reset", "info");
    });
    cacheToggle.addEventListener("change", function () {
      assembleEditor(false);
      setDiagnostic("Data cache " + (cacheToggle.checked ? "enabled" : "disabled") + " · execution reset", "info");
    });
    editor.addEventListener("input", function () {
      updateLineNumbers();
      if (running) {
        stopRunning();
      }
      setDiagnostic("Source changed · assemble before running", "warning");
    });
    editor.addEventListener("scroll", function () {
      lineNumbers.style.transform = "translateY(" + (-editor.scrollTop) + "px)";
    });

    const inspectorTabs = Array.from(root.querySelectorAll("[data-inspector-tab]"));
    inspectorTabs.forEach(function (tab, tabIndex) {
      tab.addEventListener("click", function () {
        const target = tab.dataset.inspectorTab;
        activeInspector = target;
        inspectorTabs.forEach(function (button) {
          const selected = button === tab;
          button.setAttribute("aria-selected", String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        root.querySelectorAll("[data-inspector-panel]").forEach(function (panel) {
          panel.hidden = panel.dataset.inspectorPanel !== target;
        });
        renderInspector(cpu.snapshot());
      });
      tab.addEventListener("keydown", function (event) {
        let nextIndex = null;
        if (event.key === "ArrowRight") {
          nextIndex = (tabIndex + 1) % inspectorTabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (tabIndex - 1 + inspectorTabs.length) % inspectorTabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = inspectorTabs.length - 1;
        }
        if (nextIndex !== null) {
          event.preventDefault();
          inspectorTabs[nextIndex].focus();
          inspectorTabs[nextIndex].click();
        }
      });
    });

    root.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        assembleEditor(false);
      } else if (event.key === "F8") {
        event.preventDefault();
        stepButton.click();
      } else if (event.key === "F9") {
        event.preventDefault();
        runButton.click();
      }
    });

    editor.value = SAMPLE_PROGRAMS.fibonacci.source;
    updateLineNumbers();
    sampleSelect.value = "fibonacci";
    assembleEditor(false);
    loader.hidden = true;

    return {
      setActive: function (isActive) {
        active = Boolean(isActive);
        if (!active && running) {
          stopRunning();
        }
        if (active) {
          render();
        }
      },
      getCpu: function () { return cpu; },
    };
  }

  const api = {
    ABI_NAMES: ABI_NAMES,
    AssemblyError: AssemblyError,
    BranchPredictor: BranchPredictor,
    DataCache: DataCache,
    PipelineCPU: PipelineCPU,
    SAMPLE_PROGRAMS: SAMPLE_PROGRAMS,
    assemble: assemble,
    decode: decode,
    hex: hex,
    runReference: runReference,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.RISCV_PIPELINE = api;
    if (typeof document !== "undefined") {
      globalScope.CPU_LAB = mountCpuLab();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
