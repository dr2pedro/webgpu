import type { GPUDeviceAdapter } from "./engine/adapter";
import type { Buffer, Command, Group, Pipeline } from "./engine/aggregates";
import type { GPUCommandRepository } from "./engine/repository";

type JobSize = {
    x: number,
    y?: number,
    z?: number
}

type BufferBind = {
    buffer1: globalThis.GPUBuffer,
    buffer2: globalThis.GPUBuffer,
    size: number,
    offsets: [number, number]
}

export {
    JobSize,
    BufferBind,
    GPUDeviceAdapter,
    Buffer,
    Command,
    Group,
    Pipeline,
    GPUCommandRepository
}