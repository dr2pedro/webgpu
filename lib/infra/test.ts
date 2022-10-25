import shader from "./shaders/shader.wgsl?raw";
import { GPUDeviceAdapter } from "./engine/adapter";
import { GPUCommandRepository } from "./engine/repository";
import { Buffer, Group, Pipeline, Command } from "./engine/aggregates";
import { GPUBufferBindingType } from "./engine/enums";

const repository = new GPUCommandRepository();
const adapter = await GPUDeviceAdapter.init(repository)

if(adapter.adapter !== null) {
    const device =  adapter.device;
    const firstMatrix = new Float32Array([
        2, 4,
        1, 2, 3, 4,
        5, 6, 7, 8
      ]);
    const { buffer: gpuBufferFirstMatrix, layout: layoutFirstMatrix } = new Buffer(adapter, GPUBufferBindingType["read-only-storage"]).create(firstMatrix.byteLength, GPUBufferUsage.STORAGE, true, 'firstMatrix');
    const arrayBufferFirstMatrix = gpuBufferFirstMatrix.getMappedRange();
    new Float32Array(arrayBufferFirstMatrix).set(firstMatrix);
    gpuBufferFirstMatrix.unmap();
      
    const secondMatrix = new Float32Array([
        4, 2,
        1, 2,
        3, 4,
        5, 6,
        7, 8
    ]);
    
    const { buffer: gpuBufferSecondMatrix, layout: layoutSecondMatrix } = new Buffer(adapter, GPUBufferBindingType["read-only-storage"]).create(secondMatrix.byteLength, GPUBufferUsage.STORAGE, true, 'secondMatrix');
    const arrayBufferSecondMatrix = gpuBufferSecondMatrix.getMappedRange();
    new Float32Array(arrayBufferSecondMatrix).set(secondMatrix);
    gpuBufferSecondMatrix.unmap();

    const resultMatrixBufferSize = Float32Array.BYTES_PER_ELEMENT * (2 + firstMatrix[0] * secondMatrix[1]);
    const { buffer: resultMatrixBuffer, layout: layoutResultMatrix } = new Buffer(adapter, GPUBufferBindingType.storage).create(resultMatrixBufferSize, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, false, 'resultMatrix');
    const { layout: bindGroupLayout, bind: bindGroup } = new Group(
        adapter, 
        [ 
            { 
                buffer: gpuBufferFirstMatrix, 
                layout: layoutFirstMatrix 
            },
            {
                buffer: gpuBufferSecondMatrix,
                layout: layoutSecondMatrix
            },
            {
                buffer: resultMatrixBuffer,
                layout: layoutResultMatrix
            }
        ]).create()
    const shaderModule = device.createShaderModule({ code:  shader });
    const computePipeline = new Pipeline(adapter, [bindGroupLayout], shaderModule, "main").create();
    //const gpuReadBuffer = device.createBuffer({ size: resultMatrixBufferSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const { buffer: gpuReadBuffer } = new Buffer(adapter).create(resultMatrixBufferSize, GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ)
    const commandEncoder = new Command(adapter).pipeline(computePipeline).group(bindGroup, 0).size({ x: Math.ceil(firstMatrix[0] / 8), y:Math.ceil(secondMatrix[1] / 8) }).bindArrays(resultMatrixBuffer,gpuReadBuffer,resultMatrixBufferSize) .end()
    
    repository.push(commandEncoder);
    adapter.run();

    // Read buffer.
    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    console.log(new Float32Array(arrayBuffer));
}
