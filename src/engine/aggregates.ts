import { GPUDeviceAdapter } from "./adapter";
import { GPUBufferUsage, GPUBufferBindingType, GPUShaderStage } from "./enums";
import { GPUBuffer, JobSize, BufferBind, GPUBindGroupLayoutEntry } from "./types.d";

interface Buffer {
    index: number
    create(size: number, usage: GPUBufferUsage, mappedAtCreation: boolean, label: string): { buffer: GPUBuffer, layout: GPUBindGroupLayoutEntry }
}

class Buffer {
    static index = 0;
    layout!:GPUBindGroupLayoutEntry;
    
    constructor(readonly adapter: GPUDeviceAdapter, readonly type?: GPUBufferBindingType) {
        this.layout = {
            binding: Buffer.index,
            visibility: GPUShaderStage.COMPUTE,
            buffer: {
                type
            }
        }
    }

    create(size: number, usage: GPUBufferUsage, mappedAtCreation = false, label?: string) {
        Buffer.index++;
        const buffer: GPUBuffer = this.adapter.device.createBuffer({ label, mappedAtCreation, size, usage });
        const layout = this.layout
        return {
            buffer,
            layout
        }
    }
}

interface Command {
    encoder: globalThis.GPUCommandEncoder;
    computation: globalThis.GPUComputePassEncoder;
    binds: Array<BufferBind>;
    
    pipeline(pipeline: globalThis.GPUComputePipeline): this;
    group(bindgroup: globalThis.GPUBindGroup, index: number): this;
    size(jobSize: JobSize): this;
    bindArrays(buffer1: globalThis.GPUBuffer, buffer2: globalThis.GPUBuffer, size: number, offsets: [number, number]): this;
    end(): globalThis.GPUCommandBuffer;
}

class Command {
    encoder;
    computation;
    binds: Array<BufferBind> = [];
    #hasPipeline = false;
    #hasAnyBindGroup = false;
    
    constructor(readonly adapter: GPUDeviceAdapter, readonly name?: string) {
        this.encoder = this.adapter.device.createCommandEncoder();
        this.computation = this.encoder.beginComputePass();
    }

    pipeline(pipeline: GPUComputePipeline) {
        this.computation.setPipeline(pipeline);
        this.#hasPipeline = true;
        return this
    }

    group(bindgroup: GPUBindGroup, index: number) {
        this.computation.setBindGroup(index, bindgroup);
        this.#hasAnyBindGroup = true;
        return this
    }

    size(jobSize: JobSize){
        this.computation.dispatchWorkgroups(jobSize.x, jobSize.y, jobSize.z);
        return this
    }

    bindArrays(buffer1: GPUBuffer, buffer2: GPUBuffer, size: number, offsets: [number, number] = [0,0]) {
        this.binds.push({ buffer1, buffer2, size, offsets } as BufferBind);
        return this
    }

    end() {
        if(this.#hasPipeline && this.#hasAnyBindGroup) {
            this.computation.end()
            this.binds.map((i: BufferBind) => {
                this.encoder.copyBufferToBuffer(i.buffer1, i.offsets[0], i.buffer2, i.offsets[1], i.size)
            })
        }
        return this.encoder.finish()
    }

}

interface Group {
    layout: GPUBindGroupLayoutEntry[];
    bindEntries: { binding: number, resource: { buffer: GPUBuffer }}[];

    create(label?: string): { layout: GPUBindGroupLayout, bind: GPUBindGroup };
}

class Group {
    layout: GPUBindGroupLayoutEntry[] = [];
    bindEntries: { binding: number, resource: { buffer: GPUBuffer }}[] = [];

    constructor(readonly adapter: GPUDeviceAdapter, readonly bufferArray: { buffer: GPUBuffer, layout: GPUBindGroupLayoutEntry }[]) {
        bufferArray.map((i: { buffer: GPUBuffer, layout: GPUBindGroupLayoutEntry }) => {
            this.layout.push(i.layout);
            this.bindEntries.push({
                binding: i.layout.binding,
                resource: {
                    buffer: i.buffer
                }
            })
        })
    }

    create(label?: string){
        const layout = this.adapter.device.createBindGroupLayout({ entries: this.layout });
        const bind = this.adapter.device.createBindGroup({ layout, entries: this.bindEntries } as globalThis.GPUBindGroupDescriptor);
        if(label) {
            bind.label = label;
        }
         return { layout, bind }
    }
}

interface Pipeline {
    groups: GPUBindGroupLayout[];

    create(): GPUComputePipeline;
}

class Pipeline {
    groups!: GPUBindGroupLayout[];

    constructor(readonly adapter: GPUDeviceAdapter, readonly bindgroupslayouts: GPUBindGroupLayout[], readonly shader: any, readonly entrypoint: string) {
        this.groups = bindgroupslayouts;
    }

    create() {
        const pipeline = this.adapter.device.createComputePipeline({
            layout: this.adapter.device.createPipelineLayout({
                bindGroupLayouts: this.groups
            }),
            compute: {
                module: this.shader,
                entryPoint: this.entrypoint
            }
        })
        return pipeline
    }
}

export {
    Buffer,
    Command,
    Group,
    Pipeline
}