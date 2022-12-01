import shader from "./shaders/shader.wgsl?raw";
import { GPUDeviceAdapter } from "./engine/adapter";
import { GPUCommandRepository } from "./engine/repository";
import { Buffer, Group, Pipeline, Command } from "./engine/aggregates";
import { GPUBufferBindingType } from "./engine/enums";

const repository = new GPUCommandRepository();
const adapter = await GPUDeviceAdapter.init(repository)

if(adapter.adapter !== null) {
    const firstMatrix = new Float32Array([
        3, 5,
        1, 2, 3, 4, 11,
        5, 6, 7, 8, 15,
        21, 40, 55, 18
      ]);
    const firstMatrixBuffer = new Buffer(adapter, GPUBufferBindingType["read-only-storage"]).create(firstMatrix.byteLength, GPUBufferUsage.STORAGE, true, 'firstMatrix');
    const arrayBufferFirstMatrix = firstMatrixBuffer.buffer.getMappedRange();
    new Float32Array(arrayBufferFirstMatrix).set(firstMatrix);
    firstMatrixBuffer.buffer.unmap();
      
    const secondMatrix = new Float32Array([
        5, 3,
        1, 2, 55,
        3, 4, 44,
        5, 6, 106,
        7, 8, 200,
        9, 10, 66
    ]);
    
    const secondMatrixBuffer = new Buffer(adapter, GPUBufferBindingType["read-only-storage"]).create(secondMatrix.byteLength, GPUBufferUsage.STORAGE, true, 'secondMatrix');
    const arrayBufferSecondMatrix = secondMatrixBuffer.buffer.getMappedRange();
    new Float32Array(arrayBufferSecondMatrix).set(secondMatrix);
    secondMatrixBuffer.buffer.unmap();

    const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + firstMatrix[0] * secondMatrix[1]);
    const resultMatrixBuffer = new Buffer(adapter, GPUBufferBindingType.storage).create(resultMatrixBufferSize, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, false, 'resultMatrix');
    const { layout: bindGroupLayout, bind: bindGroup } = new Group(adapter, [ firstMatrixBuffer, secondMatrixBuffer, resultMatrixBuffer]).create()
    const shaderModule = adapter.device.createShaderModule({ code:  shader });
    const computePipeline = new Pipeline(adapter, [bindGroupLayout], shaderModule, "main").create();
    const { buffer: gpuReadBuffer } = new Buffer(adapter).create(resultMatrixBufferSize, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
    const commandEncoder = new Command(adapter).pipeline(computePipeline).group(bindGroup, 0).size({ x: Math.ceil(firstMatrix[0] / 8), y:Math.ceil(secondMatrix[1] / 8) }).bindArrays(resultMatrixBuffer.buffer,gpuReadBuffer, resultMatrixBufferSize) .end()
    
    repository.push(commandEncoder);
    adapter.run();

    // Read buffer.
    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    console.log(new Float32Array(arrayBuffer));
}
