interface GPUCommandRepository {
    commandIndex: number;
    commandDB: GPUCommandBuffer[];

    push(command: globalThis.GPUCommandBuffer): void;
    get(): GPUCommandBuffer[];
    delete(index: number): void;
    clear(): void;
}

class GPUCommandRepository {
    commandIndex = 0
    commandDB: GPUCommandBuffer[] = [];
    
    
    push(command: globalThis.GPUCommandBuffer) {
        this.commandIndex++;
        this.commandDB.push(command);
    }
    
    get() {
        return this.commandDB
    }

    delete(index: number) {
        this.commandDB.splice(index, 1);
    }

    clear() {
        this.commandDB = [];
        this.commandIndex = 0;
    }
}

export {
    GPUCommandRepository
}