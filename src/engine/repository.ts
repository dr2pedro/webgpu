
export class GPUCommandRepository {
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